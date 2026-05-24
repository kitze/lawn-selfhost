import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-[#888]">
        This Lawn instance is protected by the server login.
      </p>
      <Link to="/dashboard">
        <Button>Open dashboard</Button>
      </Link>
    </div>
  );
}
