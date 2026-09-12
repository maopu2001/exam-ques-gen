import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
      <p className="text-sm text-muted-foreground mb-4">
        The requested page could not be found.
      </p>
      <Button asChild>
        <Link href="/">Return to Studio</Link>
      </Button>
    </div>
  );
}
