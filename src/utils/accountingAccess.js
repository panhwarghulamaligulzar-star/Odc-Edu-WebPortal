export const canViewAccountingBalances = ({
  appSettings,
  isSuperAdmin = false,
  adminInfo = null,
} = {}) =>
  isSuperAdmin === true ||
  adminInfo?.userData?.isSuperAdmin === true ||
  appSettings?.showAccountingBalancesToUsers === true;
