import { signOut } from "@/app/actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="kr-btn kr-btn--outline">Se déconnecter</button>
    </form>
  );
}
