import { Home } from "./pages/Home.jsx";
import { Movies } from "./pages/Movies.jsx";
import { MovieDetails } from "./pages/MovieDetail.jsx";
import { Bookings } from "./pages/Bookings.jsx";
import { Favourite } from "./pages/Favourites.jsx";
import App from "./App.jsx";
import { createBrowserRouter } from "react-router";
import { SeatLayout } from "./pages/SeatLayout.jsx";
import { Payment } from "./pages/Payment.jsx";
import { FoodSelection } from "./pages/FoodSelection.jsx";
import { Layout } from "./pages/admin/Layout.jsx";
import { DashBoard } from "./pages/admin/DashBoard.jsx";
import { AddShows } from "./pages/admin/AddShows.jsx";
import { ListShows } from "./pages/admin/ListShows.jsx";
import { ListBookings } from "./pages/admin/ListBookings.jsx";
import { ManageMovies } from "./pages/admin/ManageMovies.jsx";
import { ManageGenres } from "./pages/admin/ManageGenres.jsx";
import { ManageCinemas } from "./pages/admin/ManageCinemas.jsx";
import { ManageRooms } from "./pages/admin/ManageRooms.jsx";
import { SeatLayoutManagement } from "./pages/admin/SeatLayoutManagement.jsx";
import { ManagePayments } from "./pages/admin/ManagePayments.jsx";
import { ManagePromotions } from "./pages/admin/ManagePromotions.jsx";
import { ManageCustomers } from "./pages/admin/ManageCustomers.jsx";
import { ManageReviews } from "./pages/admin/ManageReviews.jsx";
import { RevenueReport } from "./pages/admin/RevenueReport.jsx";
import { ShowtimePerformance } from "./pages/admin/ShowtimePerformance.jsx";
import { SeatOccupancyReport } from "./pages/admin/SeatOccupancyReport.jsx";
import { ManageStaff } from "./pages/admin/ManageStaff.jsx";
import { ManageRoles } from "./pages/admin/ManageRoles.jsx";
import { AuditLogs } from "./pages/admin/AuditLogs.jsx";
import { SystemSettings } from "./pages/admin/SystemSettings.jsx";
import { ManageFnb } from "./pages/admin/ManageFnb.jsx";
import { ErrorPage } from "./components/ErrorPage.jsx";

export const route = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "home",
        element: <Home />,
      },
      {
        path: "movies",
        element: <Movies />,
      },
      {
        path: "movies/:id",
        element: <MovieDetails />,
      },
      {
        path: "movies/:id/:date",
        element: <SeatLayout />,
      },
      {
        path: "movies/:id/seat/:showtimeId",
        element: <SeatLayout />,
      },
      {
        path: "booking",
        element: <Bookings />,
      },
      {
        path: "payment/:bookingId",
        element: <Payment />,
      },
      {
        path: "foods/:showtimeId",
        element: <FoodSelection />,
      },
      {
        path: "favourite",
        element: <Favourite />,
      },
      {
        path: "admin",
        element: <Layout />,
        children: [
          {
            index: true,
            element: <DashBoard />,
          },
          {
            path: "dashboard",
            element: <DashBoard />,
          },
          // Nội dung phim
          {
            path: "movies",
            element: <ManageMovies />,
          },
          {
            path: "genres",
            element: <ManageGenres />,
          },
          {
            path: "fnb",
            element: <ManageFnb />,
          },
          // Hệ thống rạp
          {
            path: "cinemas",
            element: <ManageCinemas />,
          },
          {
            path: "rooms",
            element: <ManageRooms />,
          },
          {
            path: "seat-map",
            element: <SeatLayoutManagement />,
          },
          // Vận hành
          {
            path: "shows",
            element: <ListShows />,
          },
          {
            path: "list-shows",
            element: <ListShows />,
          },
          {
            path: "add-shows",
            element: <AddShows />,
          },
          {
            path: "bookings",
            element: <ListBookings />,
          },
          {
            path: "list-bookings",
            element: <ListBookings />,
          },
          {
            path: "payments",
            element: <ManagePayments />,
          },
          {
            path: "promotions",
            element: <ManagePromotions />,
          },
          // Khách hàng
          {
            path: "customers",
            element: <ManageCustomers />,
          },
          {
            path: "reviews",
            element: <ManageReviews />,
          },
          // Phân tích
          {
            path: "reports/revenue",
            element: <RevenueReport />,
          },
          {
            path: "reports/showtime-performance",
            element: <ShowtimePerformance />,
          },
          {
            path: "reports/seat-occupancy",
            element: <SeatOccupancyReport />,
          },
          // Quản trị hệ thống
          {
            path: "system/users",
            element: <ManageStaff />,
          },
          {
            path: "system/roles",
            element: <ManageRoles />,
          },
          {
            path: "system/audit-logs",
            element: <AuditLogs />,
          },
          {
            path: "system/settings",
            element: <SystemSettings />,
          },
        ],
      },
    ],
  },
]);
