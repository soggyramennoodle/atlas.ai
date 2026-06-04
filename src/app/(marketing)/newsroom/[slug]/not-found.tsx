import Link from "next/link";
import { ArrowLeft, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ArticleNotFound() {
  return (
    <div className="px-4 pb-24 pt-32">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Newspaper className="size-6" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight">
          Story not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This article may have been moved or unpublished.
        </p>
        <Button asChild className="mt-6">
          <Link href="/newsroom">
            <ArrowLeft className="size-4" />
            Back to Newsroom
          </Link>
        </Button>
      </div>
    </div>
  );
}
