export default function ToastContainer({ toasts }) {
  const colors = {
    success: 'bg-green-500',
    error:   'bg-red-500',
    info:    'bg-indigo-500',
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
      {toasts.map(toast => (
        <div
          key={toast['id']}
          className={colors[toast['type']] + ' text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-xs'}
        >
          {toast['message']}
        </div>
      ))}
    </div>
  );
}