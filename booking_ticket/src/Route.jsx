import { Home } from "./pages/Home.jsx";
import { Movies } from "./pages/Movies.jsx";
import { MovieDetails } from "./pages/MovieDetail.jsx";
import { Bookings } from "./pages/Bookings.jsx";
import { Favourite } from "./pages/Favourites.jsx";
import App from "./App.jsx";
import { createBrowserRouter, Navigate } from "react-router";
import { SeatLayout } from "./pages/SeatLayout.jsx";
import { Payment } from "./pages/Payment.jsx";
import { ForgotPassword } from "./pages/ForgotPassword.jsx";
import { ResetPassword } from "./pages/ResetPassword.jsx";
import { FoodSelection } from "./pages/FoodSelection.jsx";
import { Layout } from "./pages/admin/Layout.jsx";
import { DashBoard } from "./pages/admin/DashBoard.jsx";
import { ListShows } from "./pages/admin/ListShows.jsx";
import { ListBookings } from "./pages/admin/ListBookings.jsx";
import { ManageMovies } from "./pages/admin/ManageMovies.jsx";
import { ManageGenres } from "./pages/admin/ManageGenres.jsx";
import { ManageCinemas } from "./pages/admin/ManageCinemas.jsx";
import { CinemaDetail } from "./pages/admin/CinemaDetail.jsx";
import { ManageRooms } from "./pages/admin/ManageRooms.jsx";
import { SeatLayoutManagement } from "./pages/admin/SeatLayoutManagement.jsx";
import { ManagePayments } from "./pages/admin/ManagePayments.jsx";
import { ManagePromotions } from "./pages/admin/ManagePromotions.jsx";
import { ManageCustomers } from "./pages/admin/ManageCustomers.jsx";
import { ManageReviews } from "./pages/admin/ManageReviews.jsx";
import { RevenueReport } from "./pages/admin/RevenueReport.jsx";
import { ManageStaff } from "./pages/admin/ManageStaff.jsx";
import { SystemSettings } from "./pages/admin/SystemSettings.jsx";
import { ManageFnb } from "./pages/admin/ManageFnb.jsx";
import { WebsiteCms } from "./pages/admin/WebsiteCms.jsx";
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
        path: "forgot-password",
        element: <ForgotPassword />,
      },
      {
        path: "reset-password",
        element: <ResetPassword />,
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
            path: "cinemas/:id",
            element: <CinemaDetail />,
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
            element: <Navigate to="/admin/shows" replace />,
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
          // Quản trị hệ thống
          {
            path: "system/users",
            element: <ManageStaff />,
          },
          {
            path: "system/settings",
            element: <SystemSettings />,
          },
          { path: "website", element: <WebsiteCms /> },
        ],
      },
    ],
  },
]);
