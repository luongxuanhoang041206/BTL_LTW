import { Link } from "react-router";
import { assets } from "../../assets/assets";

export function AdminNavBar() {
  return (
    <div className="flex items-center justify-between px-6 md: px-10 h-16 border-b border-gray-300/30">
      <Link to="/home" className="w-36 flex justify-center items-center ">
        <img src={assets.rophimlogo} alt="Logo" className="w-20 h-auto" />
        <h1 className="text-2xl font-medium">RoPhim</h1>
      </Link>
      <Link to="/home"></Link>
    </div>
  );
}
