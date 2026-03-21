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
      // Wait for results container — try multiple possible selectors
      let resultsSelector = null;

      const selectors = [
        "li.reusable-search__result-container",
        'li[data-view-name="search-entity-result-universal-template"]',
        ".search-results-container ul li",
        "ul.reusable-search__entity-result-list li",
        "li.artdeco-list__item",
        ".entity-result__item",
        "div.entity-result",
      ];

      for (const selector of selectors) {
        const found = await page.$(selector);
        if (found) {
          resultsSelector = selector;
          console.log("Found results using selector:", selector);
          break;
        }
      }

      if (!resultsSelector) {
        console.log("No results selector found — taking screenshot for debug");
        await page.screenshot({ path: "debug-screenshot.png" });
        console.log(
          "Screenshot saved as debug-screenshot.png in backend folder",
        );
        break;
      }

      const results = await page.$$(resultsSelector);
      console.log("Found " + results.length + " results on this page");

      for (const result of results) {
        if (scrapedCount >= maxLeads) break;

        try {
          // Try multiple name selectors
          let name = "";
          const nameSelectors = [
            '.entity-result__title-text a span[aria-hidden="true"]',
            '.entity-result__title-line span[aria-hidden="true"]',
            "span.entity-result__title-text a span",
            'a.app-aware-link span[aria-hidden="true"]',
            '[data-anonymize="person-name"]',
            'span[aria-hidden="true"]',
          ];
          for (const sel of nameSelectors) {
            const el = await result.$(sel);
            if (el) {
              name = (await el.innerText()).trim();
              if (name && name !== "LinkedIn Member") break;
            }
          }

          // Try multiple title selectors
          let title = "";
          const titleSelectors = [
            ".entity-result__primary-subtitle",
            ".entity-result__summary--2-lines",
            '[data-anonymize="headline"]',
            ".entity-result__secondary-subtitle",
          ];
          for (const sel of titleSelectors) {
            const el = await result.$(sel);
            if (el) {
              title = (await el.innerText()).trim();
              if (title) break;
            }
          }

          // Try multiple company selectors
          let company = "";
          const companySelectors = [
            ".entity-result__secondary-subtitle",
            '[data-anonymize="company-name"]',
          ];
          for (const sel of companySelectors) {
            const el = await result.$(sel);
            if (el) {
              company = (await el.innerText()).trim();
              if (company) break;
            }
          }

          // Try multiple location selectors
          let location = "";
          const locationSelectors = [
            ".entity-result__tertiary-subtitle",
            '[data-anonymize="location"]',
          ];
          for (const sel of locationSelectors) {
            const el = await result.$(sel);
            if (el) {
              location = (await el.innerText()).trim();
              if (location) break;
            }
          }

          // Try multiple link selectors
          let linkedinUrl = "";
          const linkSelectors = [
            'a[href*="/in/"]',
            ".entity-result__title-text a",
            'a.app-aware-link[href*="/in/"]',
          ];
          for (const sel of linkSelectors) {
            const el = await result.$(sel);
            if (el) {
              const href = await el.getAttribute("href");
              if (href && href.includes("/in/")) {
                linkedinUrl = href.split("?")[0];
                break;
              }
            }
          }

          if (!name || name === "LinkedIn Member") {
            console.log("Skipping — no valid name found");
            continue;
          }

          console.log("Found: " + name + " | " + title + " | " + company);

          const leadData = {
            name,
            title,
            company,
            location,
            linkedinUrl,
            userId,
            status: "new",
          };

          const exists = await Lead.findOne({ linkedinUrl, userId });
          if (!exists && linkedinUrl) {
            const lead = new Lead(leadData);
            await lead.save();
            leads.push(leadData);
            scrapedCount++;
            console.log("Lead " + scrapedCount + " saved: " + name);
          } else {
            console.log("Duplicate or no URL — skipping: " + name);
          }
        } catch (err) {
          console.log("Error extracting lead:", err.message);
          continue;
        }

        await page.waitForTimeout(800);
      }

      if (scrapedCount < maxLeads) {
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
