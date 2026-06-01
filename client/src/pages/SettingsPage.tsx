export default function SettingsPage() {
  return (
    <div className="max-w-xl mx-auto">
      <div className="panel">
        <div className="panel-header">
          <span className="font-semibold tracking-tight">Settings</span>
        </div>
        <div className="panel-body space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Language</label>
            <select className="border border-border rounded-sm px-3 py-1.5 bg-white text-sm">
              <option>English</option>
              <option>中文</option>
              <option>日本語</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">API Base URL</label>
            <input
              type="text"
              className="w-full border border-border rounded-sm px-3 py-1.5 bg-white text-sm outline-none focus:border-border-strong"
              placeholder="http://localhost:3001/api"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
