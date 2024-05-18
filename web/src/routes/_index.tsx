import { Routes } from "src/Routes";
import { Link } from "src/components/Link";

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
