import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  Upload as UploadIcon,
  Grade as GradeIcon,
  Publish as PublishIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  SmartToy as SmartToyIcon,
  Download as DownloadIcon,
  FolderOpen as FolderOpenIcon,
  Description as DescriptionIcon,
  CloudUpload as CloudUploadIcon,
  FileDownload as FileDownloadIcon,
  Info as InfoIcon,
  Delete as DeleteIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { useWorkspaceSettingsStore } from '@/renderer/stores/Workspace/WorkspaceSettingsStore';
import { useDeepGradeStore, useMarkingScheme, useSelectedAssignment } from '@/renderer/stores/Moodle/DeepGradeStore';
import { useKBStore } from '@/renderer/stores/KB/KBStore';
import { getUserTokenFromStore } from '@/utils/user';
import { toast } from '@/utils/toast';

// Import subcomponents
import AssignmentSelector from './AssignmentSelector';
import MarkingSchemeControls from './MarkingSchemeControls';
import AvailableSchemes from './AvailableSchemes';
import AssignmentInfo from './AssignmentInfo';
import StudentTable from './StudentTable';

// Import types
import {
  AutoGradeProps,
  Assignment,
  Student,
  Submission,
  Grade,
  StudentSubmissionData,
  KnowledgeBase
} from './types';

// Helper function to read file as Data URL
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export default function AutoGrade({ workspaceId }: AutoGradeProps) {
  const intl = useIntl();
  const { getSettingsFromStore } = useWorkspaceSettingsStore();
  const { setMarkingScheme: setMarkingSchemeInStore, removeMarkingScheme, setSelectedAssignment } = useDeepGradeStore();
  const { getKnowledgeBaseDetailsList } = useKBStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [studentData, setStudentData] = useState<StudentSubmissionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableSchemes, setAvailableSchemes] = useState<any[]>([]);
  const [loadingSchemes, setLoadingSchemes] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKbId, setSelectedKbId] = useState<string>('');
  const [loadingKBs, setLoadingKBs] = useState(false);
  const [showAvailableSchemes, setShowAvailableSchemes] = useState(false);

  const settings = getSettingsFromStore(workspaceId);
  const courseId = settings?.moodle_course_id;
  const apiToken = settings?.moodle_api_token;
  const selectedAssignment = useSelectedAssignment(workspaceId);
  const currentMarkingScheme = useMarkingScheme(selectedAssignment);

  // Calculate submission statistics
  const submissionStats = React.useMemo(() => {
    if (!studentData.length) {
      return {
        totalStudents: 0,
        submitted: 0,
        pending: 0,
        draft: 0
      };
    }

    const totalStudents = studentData.length;
    let submitted = 0;
    let pending = 0;
    let draft = 0;

    studentData.forEach(data => {
      if (!data.submission) {
        pending++;
      } else {
        switch (data.submission.status) {
          case 'submitted':
            submitted++;
            break;
          case 'draft':
            draft++;
            break;
          case 'new':
          default:
            pending++;
            break;
        }
      }
    });

    return {
      totalStudents,
      submitted,
      pending,
      draft
    };
  }, [studentData]);

  // Effects
  useEffect(() => {
    if (workspaceId && courseId && apiToken) {
      loadAssignments();
      loadStudents();
    }
  }, [workspaceId, courseId, apiToken]);

  useEffect(() => {
    if (selectedAssignment && apiToken && students.length > 0) {
      loadAssignmentData();
    }
  }, [selectedAssignment, apiToken, students]);

  useEffect(() => {
    if (workspaceId) {
      loadKnowledgeBases();
    }
  }, [workspaceId]);

  // API Functions
  const getMoodleConfig = async () => {
    const presetUrlResponse = await window.electron.moodleAuth.getPresetUrl();
    if (!presetUrlResponse.success) {
      throw new Error('Failed to get Moodle configuration');
    }
    return presetUrlResponse.url;
  };

  const loadKnowledgeBases = async () => {
    try {
      setLoadingKBs(true);
      const kbs = await getKnowledgeBaseDetailsList(workspaceId);
      if (kbs) {
        const enabledKBs = kbs.filter(kb => kb.enabled);
        setKnowledgeBases(enabledKBs);
        if (!selectedKbId && enabledKBs.length > 0) {
          setSelectedKbId(enabledKBs[0].id);
        }
      }
    } catch (error: any) {
      console.error('Error loading knowledge bases:', error);
      toast.error('Failed to load knowledge bases');
    } finally {
      setLoadingKBs(false);
    }
  };

  const loadAssignments = async () => {
    if (!courseId || !apiToken) return;

    try {
      setLoading(true);
      const baseUrl = await getMoodleConfig();
      const response = await window.electron.moodleApi.getAssignments({
        baseUrl,
        apiKey: apiToken,
        courseId
      });

      if (response.success) {
        setAssignments(response.data);
      } else {
        setError(response.error || 'Failed to load assignments');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    if (!courseId || !apiToken) return;

    try {
      const baseUrl = await getMoodleConfig();
      const response = await window.electron.moodleApi.getEnrolledUsers({
        baseUrl,
        apiKey: apiToken,
        courseId
      });

      if (response.success) {
        setStudents(response.data);
      } else {
        console.error('Failed to load students:', response.error);
      }
    } catch (err: any) {
      console.error('Failed to load students:', err.message);
    }
  };

  const loadAssignmentData = async () => {
    if (!selectedAssignment || !apiToken || students.length === 0) return;

    try {
      setLoading(true);
      const baseUrl = await getMoodleConfig();

      const [submissionsResponse, gradesResponse] = await Promise.all([
        window.electron.moodleApi.getAssignmentSubmissions({
          baseUrl,
          apiKey: apiToken,
          assignmentId: selectedAssignment
        }),
        window.electron.moodleApi.getAssignmentGrades({
          baseUrl,
          apiKey: apiToken,
          assignmentId: selectedAssignment
        })
      ]);

      if (submissionsResponse.success) {
        setSubmissions(submissionsResponse.data);
      }

      if (gradesResponse.success) {
        setGrades(gradesResponse.data);
      }

      const combinedData: StudentSubmissionData[] = students.map(student => {
        const submission = submissionsResponse.success ? 
          submissionsResponse.data.find((sub: Submission) => sub.userid === student.id) : undefined;
        const grade = gradesResponse.success ? 
          gradesResponse.data.find((gr: Grade) => gr.userid === student.id) : undefined;

        return {
          student,
          submission,
          grade,
          currentGrade: grade ? grade.grade.toString() : '',
          aiGrade: undefined, // Add aiGrade field
          feedback: '',
          isEditing: false
        };
      });

      setStudentData(combinedData);
    } catch (err: any) {
      setError(err.message || 'Failed to load assignment data');
    } finally {
      setLoading(false);
    }
  };

  const loadMarkingSchemes = async () => {
    if (!workspaceId || !selectedKbId) return;

    const token = getUserTokenFromStore();
    if (!token) {
      toast.error('Authentication token not found');
      return;
    }

    try {
      setLoadingSchemes(true);
      
      const selectedKB = knowledgeBases.find(kb => kb.id === selectedKbId);
      if (!selectedKB) {
        toast.error('Selected knowledge base not found');
        return;
      }

      const kbPath = `kb/${selectedKB.name}`;
      const response = await window.electron.fileSystem.getFilesInPath({
        workspaceId,
        pathPrefix: kbPath,
        token
      });

      if (response.success && response.data) {
        const schemeFiles = response.data.map((file: any) => ({
          id: file.id,
          title: file.name,
          size: file.size || 0
        }));
        setAvailableSchemes(schemeFiles);
      } else {
        setAvailableSchemes([]);
      }
    } catch (error: any) {
      console.error('Error loading marking schemes:', error);
      toast.error('Error loading marking schemes from knowledge base');
      setAvailableSchemes([]);
    } finally {
      setLoadingSchemes(false);
    }
  };

  // Event Handlers
  const handleSelectMarkingScheme = async (schemeFile: any) => {
    if (!workspaceId || !selectedAssignment || !selectedKbId) return;

    try {
      const markingScheme = {
        content: `Marking scheme loaded from Knowledge Base: ${selectedKbId}`,
        fileName: schemeFile.title,
        fileId: schemeFile.id,
        fileSize: schemeFile.size || 0,
        kbId: selectedKbId
      };

      setMarkingSchemeInStore(selectedAssignment, markingScheme);
      toast.success(`Marking scheme "${schemeFile.title}" loaded successfully from Knowledge Base`);
    } catch (error: any) {
      console.error('Error selecting marking scheme:', error);
      toast.error('Error selecting marking scheme');
    }
  };

  const handleDownloadMarkingScheme = async () => {
    if (!currentMarkingScheme || !workspaceId) return;

    const token = getUserTokenFromStore();
    if (!token) {
      toast.error('Authentication token not found');
      return;
    }

    try {
      const result = await window.electron.ipcRenderer.invoke('dialog:showSaveDialog', {
        defaultPath: currentMarkingScheme.fileName,
        filters: [
          { name: 'Text Files', extensions: ['txt'] },
          { name: 'Markdown Files', extensions: ['md'] },
          { name: 'Document Files', extensions: ['doc', 'docx'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (!result.canceled && result.filePath) {
        const response = await window.electron.fileSystem.download(
          workspaceId,
          currentMarkingScheme.fileId,
          result.filePath,
          token
        );

        if (response.operationId) {
          toast.success(`Downloading "${currentMarkingScheme.fileName}" to ${result.filePath}`);
          
          const checkStatus = setInterval(async () => {
            const status = await window.electron.fileSystem.getStatus(response.operationId);
            
            if (status && status.status === 'completed') {
              clearInterval(checkStatus);
              toast.success(`Download completed: ${currentMarkingScheme.fileName}`);
            } else if (status && status.status === 'failed') {
              clearInterval(checkStatus);
              toast.error(`Download failed: ${status.error || 'Unknown error'}`);
            }
          }, 1000);
        }
      }
    } catch (error: any) {
      console.error('Error downloading marking scheme:', error);
      toast.error('Error downloading marking scheme');
    }
  };

  const handleRemoveMarkingScheme = () => {
    if (selectedAssignment) {
      removeMarkingScheme(selectedAssignment);
      toast.success('Marking scheme removed');
    }
  };

  const handleOpenMarkingSchemeDialog = () => {
    if (!selectedKbId) {
      toast.error('Please select a knowledge base first');
      return;
    }
    setShowAvailableSchemes(true);
    loadMarkingSchemes();
  };

  const handleUploadMarkingScheme = () => {
    if (!selectedKbId) {
      toast.error('Please select a knowledge base to upload to');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !workspaceId || !selectedKbId) return;

    const token = getUserTokenFromStore();
    if (!token) {
      toast.error('Authentication token not found');
      return;
    }

    try {
      setUploading(true);

      const selectedKB = knowledgeBases.find(kb => kb.id === selectedKbId);
      if (!selectedKB) {
        toast.error('Selected knowledge base not found');
        return;
      }

      for (const file of files) {
        const isValidType = file.name.endsWith('.txt') || 
                          file.name.endsWith('.md') || 
                          file.name.endsWith('.doc') || 
                          file.name.endsWith('.docx') ||
                          file.type.startsWith('text/');

        if (!isValidType) {
          toast.error(`Invalid file type for ${file.name}. Please upload text, markdown, or document files.`);
          continue;
        }

        const fileData = await readFileAsDataURL(file);
        const kbPath = `kb/${selectedKB.name}`;
        
        const metadata = {
          targetPath: `${kbPath}/${file.name}`,
          kbId: selectedKbId,
          type: 'marking-scheme'
        };

        const response = await window.electron.fileSystem.uploadFile({
          workspaceId,
          fileData,
          fileName: file.name,
          token,
          metadata
        });

        if (response.error) {
          toast.error(`Upload failed for ${file.name}: ${response.error}`);
        } else {
          toast.success(`${file.name} uploaded to knowledge base successfully`);
        }
      }

      await loadMarkingSchemes();
    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast.error('Error uploading files to knowledge base');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleGradeEdit = (studentId: string, field: 'currentGrade' | 'feedback', value: string) => {
    setStudentData(prev => prev.map(data => 
      data.student.id === studentId 
        ? { ...data, [field]: value }
        : data
    ));
  };

  const toggleEditMode = (studentId: string) => {
    setStudentData(prev => prev.map(data => 
      data.student.id === studentId 
        ? { ...data, isEditing: !data.isEditing }
        : data
    ));
  };

  const saveGrade = async (studentId: string) => {
    if (!selectedAssignment || !apiToken) return;

    const studentDataItem = studentData.find(data => data.student.id === studentId);
    if (!studentDataItem) return;

    try {
      const baseUrl = await getMoodleConfig();
      const response = await window.electron.moodleApi.updateAssignmentGrade({
        baseUrl,
        apiKey: apiToken,
        assignmentId: selectedAssignment,
        userId: studentId,
        grade: parseFloat(studentDataItem.currentGrade) || 0,
        feedback: studentDataItem.feedback
      });

      if (response.success) {
        toast.success('Grade updated successfully');
        toggleEditMode(studentId);
        loadAssignmentData();
      } else {
        toast.error(response.error || 'Failed to update grade');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update grade');
    }
  };

  const handleAdoptAiGrade = (studentId: string) => {
    const studentDataItem = studentData.find(data => data.student.id === studentId);
    if (!studentDataItem || !studentDataItem.aiGrade) return;

    setStudentData(prev => prev.map(data => 
      data.student.id === studentId 
        ? { ...data, currentGrade: data.aiGrade || '' }
        : data
    ));

    toast.success(`AI grade adopted for ${studentDataItem.student.fullname}`);
  };

  // Update assignment selection handler
  const handleAssignmentChange = (assignmentId: string) => {
    setSelectedAssignment(workspaceId, assignmentId);
  };

  // Render
  const selectedAssignmentData = assignments.find(a => a.id === selectedAssignment);

  if (loading && assignments.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {intl.formatMessage({ id: "workspace.insights.moodle.autograde.title", defaultMessage: "AutoGrade" })}
      </Typography>

      <AssignmentSelector
        assignments={assignments}
        selectedAssignment={selectedAssignment}
        onAssignmentChange={handleAssignmentChange}
        knowledgeBases={knowledgeBases}
        selectedKbId={selectedKbId}
        onKbChange={setSelectedKbId}
        loadingKBs={loadingKBs}
        submissionStats={submissionStats}
      />

      <MarkingSchemeControls
        selectedAssignment={selectedAssignment}
        selectedKbId={selectedKbId}
        currentMarkingScheme={currentMarkingScheme}
        uploading={uploading}
        onLoadScheme={handleOpenMarkingSchemeDialog}
        onUploadScheme={handleUploadMarkingScheme}
        onDownloadScheme={handleDownloadMarkingScheme}
        onRemoveScheme={handleRemoveMarkingScheme}
      />

      <AvailableSchemes
        show={showAvailableSchemes}
        onClose={() => setShowAvailableSchemes(false)}
        loadingSchemes={loadingSchemes}
        availableSchemes={availableSchemes}
        currentMarkingScheme={currentMarkingScheme}
        knowledgeBases={knowledgeBases}
        selectedKbId={selectedKbId}
        onSelectScheme={handleSelectMarkingScheme}
      />

      {selectedAssignment && (
        <>
          <AssignmentInfo
            assignment={selectedAssignmentData}
            currentMarkingScheme={currentMarkingScheme}
            knowledgeBases={knowledgeBases}
            submissionStats={submissionStats}
          />

          <StudentTable
            studentData={studentData}
            selectedAssignmentData={selectedAssignmentData}
            currentMarkingScheme={currentMarkingScheme}
            apiToken={apiToken}
            workspaceId={workspaceId}
            onGradeEdit={handleGradeEdit}
            onToggleEdit={toggleEditMode}
            onSaveGrade={saveGrade}
            onAdoptAiGrade={handleAdoptAiGrade}
          />
        </>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".txt,.md,.doc,.docx,text/*"
        multiple
        style={{ display: 'none' }}
      />
    </Box>
  );
}