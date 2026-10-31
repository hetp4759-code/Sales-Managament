import {
  HashRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { SalesProvider } from "./context/SalesContext";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./component/auth/ProtectedRoute";
import Layout from "./component/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import SalesInfo from "./pages/SalesInfo";
import SalesHistory from "./pages/SalesHistory";
import EditSaleDrawer from "./component/saleHistory/EditSaleDrawer";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PurchaseInfo from "./pages/PurchaseInfo";
import PurchaseHistory from "./pages/PurchaseHistory";
import Inventory from "./pages/Inventory";
import BusinessSettings from "./pages/BusinessSettings";

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <SalesProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/sales-info" element={<SalesInfo />} />
                <Route path="/sales-history" element={<SalesHistory />} />
                <Route path="/purchases" element={<PurchaseInfo />} />
                <Route path="/purchase-history" element={<PurchaseHistory />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/business-settings" element={<BusinessSettings />} />
                <Route path="/update/:id" element={<EditSaleDrawer />} />

                <Route
                  path="*"
                  element={<Navigate to="/dashboard" replace />}
                />
              </Route>
            </Route>
          </Routes>
        </SalesProvider>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;