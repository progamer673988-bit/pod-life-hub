import Dashboard from "./components/Dashboard";

export default function App() {
  // 7eyedna l-useState, useEffect w l-auth kamlin
  // Daba l-app k-t-7ell direct f l-Dashboard
  
  const guestUser = {
    displayName: "Othman & Cousin",
    email: "business@pod-luxe.com",
    uid: "guest-admin"
  };

  return <Dashboard user={guestUser} />;
}
