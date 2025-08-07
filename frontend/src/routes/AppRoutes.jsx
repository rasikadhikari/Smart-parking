import { Routes, Route } from "react-router-dom";
import { Navigate } from "react-router-dom";
import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import ParkingSlotsPage from "../pages/ParkingSlotsPage";
import BookingPage from "../Users/Admin/BookingPage";
import BookingConfirmationPage from "../pages/BookingConfirmationPage";
import CreateSlotPage from "../Users/Admin/CreateSlotPage";
import MyBookingsPage from "../Users/Costumer/MyBookingsPage";
import BookingDetailsPage from "../pages/BookingDetailsPage";
import AdminBookingsPage from "../Users/Admin/AdminBookingsPage";
import AdminDashboard from "../Users/Admin/AdminDashboard";
import SuperAdminDashboard from "../Users/SuperAdmin/SuperAdminDashboard";
import ParkingSpacesPage from "../Users/SuperAdmin/ParkingSpacesPage";
import SuperadminMarkerManager from "../Users/SuperAdmin/SuperadminMarkerManager.tsx";
import Dashboard from "../Users/Costumer/Dashboard";
import PrivateRoute from "./PrivateRoute";
import AllUserBooking from "../Users/SuperAdmin/AllUserBooking";
import SuperAdminNotificationPage from "../Users/SuperAdmin/SuperAdminNotificationPage";
import SuperAdminUserManagement from "../Users/SuperAdmin/SuperAdminUserManagement.tsx";
import CreateAdmin from "../Users/SuperAdmin/CreateAdmin";
import SlotWatchlist from "../Users/Admin/SlotWatchlist";
import CostumizeSlot from "../Users/Admin/CostumizeSlot";
import AdminBookingForm from "../components/BookingForm";
import AdminProfileSetting from "../Users/Admin/AdminProfileSetting";
import CostumerProfileSetting from "../Users/Costumer/CostumerProfileSetting";

// Define roles as constants for consistency
const ROLES = {
  USER: "user",
  ADMIN: "admin",
  SUPERADMIN: "superadmin",
};

const AppRoutes = ({
  user,
  slots,
  bookings,
  selectedParkingSpaceId,
  loading,
  parkingSpaces,
  setSelectedParkingSpaceId,
  setUser,
}) => (
  <Routes>
    {/* Public routes - accessible to all users */}
    <Route index element={<LandingPage />} />
    <Route path="/login" element={<LoginPage setUser={setUser} />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route
      path="/slots/:id"
      element={<ParkingSlotsPage user={user} appLoading={loading} />}
    />
    <Route
      path="/confirmation/:bookingId"
      element={<BookingConfirmationPage user={user} />}
    />
    <Route
      path="/booking-confirmation"
      element={<BookingConfirmationPage user={user} />}
    />
    <Route
      path="/booking-details/:id"
      element={<BookingDetailsPage user={user} />}
    />

    {/* Shared routes - accessible to user, admin, and superadmin */}
    <Route
      element={
        <PrivateRoute
          user={user}
          allowedRoles={[ROLES.USER, ROLES.ADMIN, ROLES.SUPERADMIN]}
        />
      }
    >
      <Route path="/dashboard" element={<Dashboard />} />
    </Route>

    {/* Admin and Superadmin routes */}
    <Route
      element={
        <PrivateRoute
          user={user}
          allowedRoles={[ROLES.ADMIN, ROLES.SUPERADMIN]}
        />
      }
    >
      <Route
        path="/AllBookings"
        element={
          <AdminBookingsPage
            user={user}
            bookings={Object.values(bookings).flat()}
          />
        }
      />
    </Route>

    {/* Superadmin routes */}
    <Route
      element={<PrivateRoute user={user} allowedRoles={[ROLES.SUPERADMIN]} />}
    >
      <Route path="/superadmin" element={<SuperAdminDashboard user={user} />} />
      <Route
        path="/superadmin-marker-manager"
        element={<SuperadminMarkerManager user={user} />}
      />
      <Route
        path="/superadmin-user-management"
        element={<SuperAdminUserManagement user={user} />}
      />
      <Route
        path="/superadmin/notifications"
        element={<SuperAdminNotificationPage user={user} />}
      />
      <Route path="/Create-Admin" element={<CreateAdmin user={user} />} />
      <Route
        path="/all-user-booking"
        element={<AllUserBooking user={user} />}
      />
      <Route
        path="/parking-spaces"
        element={
          <ParkingSpacesPage
            user={user}
            parkingSpaces={parkingSpaces}
            setSelectedParkingSpaceId={setSelectedParkingSpaceId}
          />
        }
      />
    </Route>

    {/* Admin routes */}
    <Route element={<PrivateRoute user={user} allowedRoles={[ROLES.ADMIN]} />}>
      <Route path="/admin" element={<AdminDashboard />} />
      <Route
        path="/create-slot"
        element={<CreateSlotPage user={user} parkingSpaces={parkingSpaces} />}
      />
      <Route path="/admin-profile" element={<AdminProfileSetting />} />
      <Route path="/Slot-Watchlist" element={<SlotWatchlist />} />
      <Route
        path="/slots/customize"
        element={<CostumizeSlot user={user} parkingSpaces={parkingSpaces} />}
      />
      <Route path="/admin-booking" element={<AdminBookingForm user={user} />} />
    </Route>

    {/* Customer (user) routes */}
    <Route element={<PrivateRoute user={user} allowedRoles={[ROLES.USER]} />}>
      <Route
        path="/my-bookings"
        element={
          <MyBookingsPage
            user={user}
            bookings={
              bookings[selectedParkingSpaceId] || bookings["null"] || []
            }
          />
        }
      />
      <Route path="/profile" element={<CostumerProfileSetting />} />
      <Route
        path="/book"
        element={
          <BookingPage
            slots={slots[selectedParkingSpaceId] || slots["null"] || []}
            user={user}
            parkingSpaceId={selectedParkingSpaceId}
          />
        }
      />
    </Route>

    {/* Catch-all route for invalid URLs */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRoutes;
