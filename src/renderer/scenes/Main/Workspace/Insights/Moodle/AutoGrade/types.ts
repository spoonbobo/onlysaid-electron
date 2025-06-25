export interface AutoGradeProps {
  workspaceId: string;
}

export interface Assignment {
  id: string;
  name: string;
  intro: string;
  duedate: number;
  grade: number;
  timemodified: number;
}

export interface Student {
  id: string;
  username: string;
  firstname: string;
  lastname: string;
  fullname: string;
  email: string;
}

export interface Submission {
  id: string;
  userid: string;
  status: string;
  timemodified: number;
  plugins?: any[];
}

export interface Grade {
  id: string;
  userid: string;
  grade: number;
  grader: string;
  timemodified: number;
}

export interface StudentSubmissionData {
  student: Student;
  submission?: Submission;
  grade?: Grade;
  currentGrade: string;
  aiGrade?: string;
  feedback: string;
  isEditing: boolean;
}

export interface MarkingScheme {
  content: string;
  fileName: string;
  fileId: string;
  fileSize?: number;
  kbId?: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  enabled: boolean;
  url?: string;
}

export interface SubmissionStats {
  totalStudents: number;
  submitted: number;
  pending: number;
  draft: number;
} 