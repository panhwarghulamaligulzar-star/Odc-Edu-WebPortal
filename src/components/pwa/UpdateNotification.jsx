import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UpdateNotification = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) {
    return null;
  }

  return (
    <div className="update-notification">
      <div className="notification-content">
        {offlineReady ? (
          <span>App ready to work offline</span>
        ) : (
          <span>New content available, click reload to update.</span>
        )}
        <div className="notification-buttons">
          {needRefresh && (
            <button onClick={() => updateServiceWorker(true)}>
              Reload
            </button>
          )}
          <button onClick={close}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;