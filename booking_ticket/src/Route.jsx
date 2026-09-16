import { Home } from "./pages/Home.jsx";
import { Movies } from "./pages/Movies.jsx";
import { MovieDetails } from "./pages/MovieDetail.jsx";
import { Bookings } from "./pages/Bookings.jsx";
import { Favourite } from "./pages/Favourites.jsx";
import App from "./App.jsx";
import { createBrowserRouter } from "react-router";
import { SeatLayout } from "./pages/SeatLayout.jsx";
import { Layout } from "./pages/admin/Layout.jsx";
import { DashBoard } from "./pages/admin/DashBoard.jsx";
import { AddShows } from "./pages/admin/AddShows.jsx";
import { ListShows } from "./pages/admin/ListShows.jsx";
import { ListBookings } from "./pages/admin/ListBookings.jsx";
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
        path: "favourite",
        element: <Favourite />,
      },
      {
        path: "admin",
        element: <Layout />,
        children: [
          {
            path: "dashboard",
            element: <DashBoard />,
          },
          {
            index: true,
            element: <DashBoard />,
          },
          {
            path: "add-shows",
            element: <AddShows />,
          },
          {
            path: "list-shows",
            element: <ListShows />,
          },
          {
            path: "list-bookings",
            element: <ListBookings />,
          },
        ],
      },
    ],
  },
]);
