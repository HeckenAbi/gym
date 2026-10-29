import WorkoutDetailsClient from "./WorkoutDetailsClient";

export const instant = false;

export default async function WorkoutDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkoutDetailsClient workoutId={id} />;
}
