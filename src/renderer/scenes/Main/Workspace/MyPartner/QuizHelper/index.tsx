import QuizHelperMain from "../CourseworkHelper/QuizHelper";

interface QuizHelperProps {
  workspaceId: string;
}

function QuizHelper({ workspaceId }: QuizHelperProps) {
  // Use the existing complex QuizHelper component
  return <QuizHelperMain workspaceId={workspaceId} />;
}

export default QuizHelper; 