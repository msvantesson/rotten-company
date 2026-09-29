import Link from "next/link";

type RottenScoreExplanationProps =
  | { variant: "compact" }
  | {
      variant: "company";
      companyName: string;
      evidenceCount: number;
      score: number | null;
    };

export default function RottenScoreExplanation(props: RottenScoreExplanationProps) {
  const methodologyLink = (
    <Link
      href="/rotten-score"
      className="text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      How scoring works →
    </Link>
  );

  if (props.variant === "compact") {
    return (
      <p className="text-sm text-muted-foreground">
        Scores run from 0 to 100. Higher means more documented harm. Calculated from approved evidence, weighted by severity.{" "}
        {methodologyLink}
      </p>
    );
  }

  const evidenceWord = props.evidenceCount === 1 ? "record" : "records";

  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      <p>
        Based on {props.evidenceCount} approved evidence {evidenceWord}. A higher score means more documented harm.
      </p>
      {props.evidenceCount === 0 && (
        <p>
          No approved evidence records are currently available for {props.companyName}.
          This does not establish that no misconduct occurred.
        </p>
      )}
      <p>{methodologyLink}</p>
    </div>
  );
}
