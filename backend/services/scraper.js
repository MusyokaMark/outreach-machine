import { chromium } from "playwright";
import Lead from "../models/Lead.js";

export async function scrapeLinkedInLeads(searchQuery, maxLeads = 10, userId) {
  console.log(`Starting LinkedIn scrape for: "${searchQuery}"`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.setDefaultNavigationTimeout(90000);
  const limit = maxLeads || 10;
  const leads = [];

  try {
    // Step 1: Go to LinkedIn login
    console.log("Opening LinkedIn login...");
    await page.goto("https://www.linkedin.com/login", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector("#username", { timeout: 15000 });

    // Step 2: Fill credentials slowly like a human
    await page.fill("#username", process.env.LINKEDIN_EMAIL);
    await page.waitForTimeout(1000);
    await page.fill("#password", process.env.LINKEDIN_PASSWORD);
    await page.waitForTimeout(1000);

    // Step 3: Click sign in
    await page.click('[type="submit"]');
    console.log("Sign in clicked — waiting for navigation...");

    // Step 4: Wait for ANY of these outcomes
    try {
      await Promise.race([
        // Success — landed on feed
        page.waitForURL("**/feed/**", { timeout: 90000 }),
        // Success — landed on home
        page.waitForURL("**/home/**", { timeout: 90000 }),
        // Challenge — verification page
        page.waitForURL("**/checkpoint/**", { timeout: 90000 }),
        // Challenge — security check
        page.waitForURL("**/security/**", { timeout: 90000 }),
      ]);
    } catch {
      console.log("Navigation timeout — checking current page...");
    }

    const currentUrl = page.url();
    console.log("Current URL after login:", currentUrl);

    // Step 5: Handle verification challenge
    if (
      currentUrl.includes("checkpoint") ||
      currentUrl.includes("security") ||
      currentUrl.includes("challenge")
    ) {
      console.log("LinkedIn verification required!");
      console.log("Please complete the verification in the browser window...");

      // Wait up to 2 minutes for user to complete verification manually
      try {
        await Promise.race([
          page.waitForURL("**/feed/**", { timeout: 120000 }),
          page.waitForURL("**/home/**", { timeout: 120000 }),
        ]);
        console.log("Verification completed!");
      } catch {
        throw new Error(
          "Verification not completed in time — please try again",
        );
      }
    }

    // Step 6: Check if we are logged in
    if (
      !page.url().includes("feed") &&
      !page.url().includes("home") &&
      !page.url().includes("mynetwork")
    ) {
      console.log("Login may have failed — current URL:", page.url());
      // Wait a bit more just in case
      await page.waitForTimeout(5000);
    }

    console.log("LinkedIn login successful");

    // Step 7: Search for people
    const searchUrl =
      "https://www.linkedin.com/search/results/people/?keywords=" +
      encodeURIComponent(searchQuery) +
      "&origin=GLOBAL_SEARCH_HEADER";

    console.log("Navigating to search page...");
    await page.goto(searchUrl, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.waitForTimeout(5000);

    console.log("Search page loaded");
    // Print all class names on page for debugging
    const classList = await page.evaluate(() => {
      const items = document.querySelectorAll("li");
      return [...new Set([...items].map((el) => el.className))].slice(0, 20);
    });
    console.log("Page li classes found:", JSON.stringify(classList));

    // Step 8: Debug — print page HTML to see what selectors exist
    const pageContent = await page.content();
    const hasResults = pageContent.includes("search-results");
    console.log("Page has search-results:", hasResults);

    let scrapedCount = 0;

    while (scrapedCount < maxLeads) {
      // Wait for any list items to appear
      await page.waitForTimeout(3000);

      // Use evaluate to extract all lead data directly from the page DOM
      const extractedLeads = await page.evaluate(() => {
        const results = [];

        // Find all links that point to LinkedIn profiles
        const profileLinks = document.querySelectorAll('a[href*="/in/"]');

        profileLinks.forEach((link) => {
          const href = link.getAttribute("href") || "";

          // Only process actual profile links not nav links
          if (!href.includes("/in/") || href.includes("/in/feed")) return;

          // Clean the URL
          const linkedinUrl = href.split("?")[0];

          // Skip duplicates in this batch
          if (results.find((r) => r.linkedinUrl === linkedinUrl)) return;

          // Try to get the name from the link text
          let name = "";
          const spans = link.querySelectorAll('span[aria-hidden="true"]');
          if (spans.length > 0) {
            name = spans[0].innerText.trim();
          }
          if (!name) {
            name = link.innerText.trim().split("\n")[0].trim();
          }

          // Skip if no name or is LinkedIn Member
          if (!name || name === "LinkedIn Member" || name.length < 2) return;

          // Try to find the parent container to get more info
          let title = "";
          let company = "";
          let location = "";

          // Walk up the DOM to find the result container
          let container = link.parentElement;
          for (let i = 0; i < 8; i++) {
            if (!container) break;
            const text = container.innerText || "";
            const lines = text
              .split("\n")
              .map((l) => l.trim())
              .filter((l) => l.length > 2);

            if (lines.length >= 2) {
              // First line is usually name, second is title
              if (lines[1] && lines[1] !== name) title = lines[1];
              if (lines[2] && lines[2] !== name && lines[2] !== title)
                company = lines[2];
              if (
                lines[3] &&
                lines[3] !== name &&
                lines[3] !== title &&
                lines[3] !== company
              )
                location = lines[3];
              break;
            }
            container = container.parentElement;
          }

          results.push({ name, title, company, location, linkedinUrl });
        });

        return results;
      });

      console.log(
        "Extracted " + extractedLeads.length + " potential leads from page",
      );

      for (const leadData of extractedLeads) {
        if (scrapedCount >= limit) break;

        console.log("Processing: " + leadData.name + " | " + leadData.title);

        try {
          const exists = await Lead.findOne({
            linkedinUrl: leadData.linkedinUrl,
            userId,
          });

          if (!exists && leadData.linkedinUrl) {
            const lead = new Lead({
              ...leadData,
              userId,
              status: "new",
            });
            await lead.save();
            leads.push(leadData);
            scrapedCount++;
            console.log("✅ Lead " + scrapedCount + " saved: " + leadData.name);
          } else {
            console.log("⚠️ Duplicate — skipping: " + leadData.name);
          }
        } catch (err) {
          console.log("Error saving lead:", err.message);
        }
      }

      // Go to next page
      if (scrapedCount < limit) {
        const nextBtn = await page.$('button[aria-label="Next"]');
        if (nextBtn) {
          await nextBtn.click();
          await page.waitForTimeout(4000);
        } else {
          console.log("No more pages");
          break;
        }
      }
    }

    console.log("Scraping complete! Found " + leads.length + " leads");
    return leads;
  } catch (err) {
    console.error("Scraper error:", err.message);
    throw err;
  } finally {
    await browser.close();
  }
}
