import { Navigate } from "react-router-dom";
import useZustandStore from "../../stores/zustandStore";

export default function ProtectedRoute({ children }) {
  const { token } = useZustandStore();
 const  mytoken = localStorage.getItem("token")

  if (!mytoken) {
    return <Navigate to="/login" replace />;
  }

  return children;
}