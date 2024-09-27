import { Link } from "@remix-run/react";
import { Routes } from "src/Routes";

// TODO: add home page
export default function Home() {
  return (
    <ul>
      <li>
        <Link to={Routes.account.home}>My account</Link>
      </li>
    </ul>
  );
}
