
import WebHeader from '../../layout/WebHeader'
import OdysseyFooter from '../../layout/OdysseyFooter'
import { Outlet, useLocation } from 'react-router-dom'

const Layout = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <>
      {!isLoginPage && <WebHeader />}
      
      <div className={isLoginPage ? '' : 'pt-[180px] md:pt-[200px] lg:pt-[210px]'}>
        <Outlet />
      </div>
      {!isLoginPage && <OdysseyFooter />}
    </>
  )
}

export default Layout
