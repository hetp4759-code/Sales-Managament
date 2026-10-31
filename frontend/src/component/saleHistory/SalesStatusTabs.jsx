
const tabs = [
  { label: "All Sales", value: "All" },
  { label: "Paid", value: "Paid" },
  { label: "Partial", value: "Partial" },
  { label: "Pending", value: "Pending" },
];

const SalesStatusTabs = ({
  activeStatus,
  onStatusChange,
  counts = {},
}) => {
  return (
    <div
      className="flex gap-2 overflow-x-auto border-b border-gray-200"
      role="tablist"
      aria-label="Filter sales by payment status"
    >
      {tabs.map((tab) => {
        const isActive = activeStatus === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onStatusChange(tab.value)}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
              isActive
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800"
            }`}
          >
            <span>{tab.label}</span>

            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                isActive
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {counts[tab.value] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default SalesStatusTabs;
