import { PageHeader } from '../../../components/shared/PageHeader';
import { QBOConnectionPanel } from './QBOConnectionPanel';
import { QBOCustomerSyncPanel } from './QBOCustomerSyncPanel';
import { QBOItemMappingPanel } from './QBOItemMappingPanel';
import { QBOBulkSyncPanel } from './QBOBulkSyncPanel';

export function Settings() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Settings"
        showPeriodSelector={false}
        showViewToggle={false}
      />

      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">
          <QBOConnectionPanel />
          <QBOCustomerSyncPanel />
          <QBOItemMappingPanel />
          <QBOBulkSyncPanel />
        </div>
      </div>
    </div>
  );
}
