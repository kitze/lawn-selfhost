import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export default function SignUpPage() {
  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-[#888]">
        Accounts are disabled for this self-hosted Lawn instance.
      </p>
      <Link to="/dashboard">
        <Button>Open dashboard</Button>
      </Link>
    </div>
  );
}
