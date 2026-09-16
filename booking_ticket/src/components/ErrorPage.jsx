import { Link } from "react-router";

export function ErrorPage() {
  return (
    <div className="flex flex-col justify-center items-center h-200">
      <h1 className="text-3xl">
        This page is not exist or it hasn't been created yet
      </h1>
      <Link to="/home" className="underline text-primary text-2xl">
        Go back
      </Link>
    </div>
  );
}
