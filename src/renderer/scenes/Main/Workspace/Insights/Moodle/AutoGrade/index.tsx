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
  Divider,
  Card,
  CardContent
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

// UPDATED: Import from modular stores
import { 
  useAutoGradeStore, 
  useExecuteAutoGrade, 
  useUserGradeInfo, 
  useDeleteUserGrade, 
  useDeleteGradeSubmission, 
  useResetUserGrade, 
  useResetGradeSubmission 
} from '@/renderer/stores/Insight/AutoGrade/AutoGradeStore';
import { 
  useSelectedAssignment, 
  useSetSelectedAssignment 
} from '@/renderer/stores/Insight/AutoGrade/AssignmentStore';
import { 
  useMarkingScheme, 
  useSetMarkingScheme, 
  useRemoveMarkingScheme 
} from '@/renderer/stores/Insight/AutoGrade/MarkingSchemeStore';

import { useKBStore } from '@/renderer/stores/KB/KBStore';
import { getUserTokenFromStore } from '@/utils/user';
import { toast } from '@/utils/toast';

// Import subcomponents
import AssignmentSelector from './AssignmentSelector';
import MarkingSchemeControls from './MarkingSchemeControls';
import AvailableSchemes from './AvailableSchemes';
import AssignmentInfo from './AssignmentInfo';
import StudentTable from './StudentTable';
import MarkingSchemePicker from '@/renderer/components/Dialog/Insight/MarkingSchemePicker';

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
  
  // UPDATED: Use modular stores
  const setMarkingSchemeInStore = useSetMarkingScheme();
  const removeMarkingScheme = useRemoveMarkingScheme();
  const setSelectedAssignment = useSetSelectedAssignment();
  const { getUserGradeInfo } = useAutoGradeStore();
  
  const { getKnowledgeBaseDetailsList } = useKBStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const executeAutoGrade = useExecuteAutoGrade();
  const deleteUserGrade = useDeleteUserGrade();
  const deleteGradeSubmission = useDeleteGradeSubmission();
  const resetUserGrade = useResetUserGrade();
  const resetGradeSubmission = useResetGradeSubmission();

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
  
  // UPDATED: Use modular store hooks
  const selectedAssignment = useSelectedAssignment(workspaceId);
  const currentMarkingScheme = useMarkingScheme(selectedAssignment);

  // Calculate submission and grading statistics based on published state
  const stats = React.useMemo(() => {
    if (!studentData.length) {
      return {
        totalStudents: 0,
        submitted: 0,
        pending: 0,
        draft: 0,
        graded: 0,
        ungraded: 0,
        published: 0,
        unpublished: 0
      };
    }

    const totalStudents = studentData.length;
    let submitted = 0;
    let pending = 0;
    let draft = 0;
    let graded = 0;
    let ungraded = 0;
    let published = 0;
    let unpublished = 0;

    studentData.forEach(data => {
      // Submission status
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

      // Grading status based on published state
      if (data.grade && data.grade.grade > 0) {
        // Grade is published in Moodle
        published++;
        graded++;
      } else if (data.currentGrade && data.currentGrade !== '0' && data.currentGrade !== '') {
        // Grade exists but not published yet
        unpublished++;
        graded++;
      } else {
        // No grade assigned
        ungraded++;
      }
    });

    return {
      totalStudents,
      submitted,
      pending,
      draft,
      graded,
      ungraded,
      published,
      unpublished
    };
  }, [studentData]);

  // Calculate progress percentages - grading progress now based on published grades
  const submissionProgress = stats.totalStudents > 0 ? (stats.submitted / stats.totalStudents) * 100 : 0;
  const gradingProgress = stats.totalStudents > 0 ? (stats.published / stats.totalStudents) * 100 : 0;

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
    if (!selectedAssignment || !apiToken || students.length === 0 || !courseId) return;

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

        // FIXED: Load persisted grade info from hierarchical store
        const persistedGradeInfo = getUserGradeInfo(workspaceId, courseId, student.id);
        
        // FIXED: Also check legacy store for backward compatibility
        const legacyResult = useAutoGradeStore.getState().getAutoGradeResult(student.id);

        return {
          student,
          submission,
          grade,
          currentGrade: grade ? grade.grade.toString() : (persistedGradeInfo?.currentGrade?.toString() || ''),
          aiGrade: persistedGradeInfo?.aiGrade || legacyResult?.aiGrade || undefined,
          feedback: persistedGradeInfo?.feedback || legacyResult?.feedback || '',
          isEditing: false
        };
      });

      const processGradeData = (gradeData: any) => {
        // If grade is -1 (deleted), treat it as no grade
        if (gradeData.grade === -1) {
          return {
            ...gradeData,
            grade: 0, // Convert -1 to 0 for display purposes
            feedback: gradeData.feedback || ''
          };
        }
        return gradeData;
      };

      const enhancedStudentData = combinedData.map((data: any) => {
        const processedGrade = data.grade ? processGradeData(data.grade) : null;
        
        // Get the persisted grade info for this student
        const persistedGradeInfo = getUserGradeInfo(workspaceId, courseId, data.student.id);
        
        return {
          ...data,
          grade: processedGrade,
          currentGrade: persistedGradeInfo?.currentGrade?.toString() || (processedGrade?.grade > 0 ? processedGrade.grade.toString() : ''),
          aiGrade: persistedGradeInfo?.aiGrade || data.aiGrade,
          feedback: persistedGradeInfo?.feedback || data.feedback,
          isEditing: false
        };
      });

      setStudentData(enhancedStudentData);
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
    if (!courseId) return;

    setStudentData(prev => prev.map(data => 
      data.student.id === studentId 
        ? { ...data, [field]: value }
        : data
    ));

    // FIXED: Persist changes to hierarchical store
    const currentInfo = getUserGradeInfo(workspaceId, courseId, studentId);
    const updatedInfo = {
      aiGrade: currentInfo?.aiGrade || '',
      currentGrade: field === 'currentGrade' ? (parseFloat(value) || null) : (currentInfo?.currentGrade || null),
      feedback: field === 'feedback' ? value : (currentInfo?.feedback || ''),
      timestamp: new Date().toISOString(),
      published: currentInfo?.published || false,
    };

    useAutoGradeStore.getState().setUserGradeInfo(workspaceId, courseId, studentId, updatedInfo);
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

  // NEW: Function to verify grades after publishing
  const verifyGradeInMoodle = async (assignmentId: string, studentId: string) => {
    if (!apiToken) return null;

    try {
      const baseUrl = await getMoodleConfig();
      const response = await window.electron.moodleApi.getAssignmentGradeDetails({
        baseUrl,
        apiKey: apiToken,
        assignmentId,
        userId: studentId
      });

      if (response.success && response.data && response.data.length > 0) {
        return response.data[0]; // Return the grade data from Moodle
      }
      return null;
    } catch (error) {
      console.error('Error verifying grade in Moodle:', error);
      return null;
    }
  };

  // UPDATED: Enhanced grade publishing with verification
  const handlePublishGrade = async (studentId: string) => {
    if (!selectedAssignment || !apiToken || !courseId) return;

    const studentDataItem = studentData.find(data => data.student.id === studentId);
    if (!studentDataItem || !studentDataItem.currentGrade) {
      toast.error('No grade to publish');
      return;
    }

    try {
      const baseUrl = await getMoodleConfig();
      
      // Step 1: Publish the grade
      const response = await window.electron.moodleApi.updateAssignmentGrade({
        baseUrl,
        apiKey: apiToken,
        assignmentId: selectedAssignment,
        userId: studentId,
        grade: parseFloat(studentDataItem.currentGrade) || 0,
        feedback: studentDataItem.feedback,
        courseId: courseId
      });

      if (response.success) {
        toast.success(`Grade published for ${studentDataItem.student.fullname}`);
        console.log('Grade published successfully:', response.data);
        
        // Step 2: Verify the grade was actually saved in Moodle
        const verifiedGrade = await verifyGradeInMoodle(selectedAssignment, studentId);
        
        if (verifiedGrade) {
          // Step 3: Update store with verified grade status
          const { setGradeSubmission, refreshGradeStatus } = useAutoGradeStore.getState();
          const submissionKey = `${selectedAssignment}-${studentId}`;
          
          setGradeSubmission(submissionKey, {
            studentId,
            assignmentId: selectedAssignment,
            courseId,
            grade: verifiedGrade.grade,
            feedback: verifiedGrade.feedback || studentDataItem.feedback,
            timestamp: new Date().toISOString(),
            published: true
          });

          // Also refresh the grade status in store
          refreshGradeStatus(selectedAssignment, studentId, verifiedGrade, courseId);
          
          toast.success(`Grade verified in Moodle: ${verifiedGrade.grade}/${selectedAssignmentData?.grade}`);
        } else {
          // toast.warning('Grade published but verification failed. Please check Moodle manually.');
        }
        
        // Step 4: Reload assignment data to update the UI
        loadAssignmentData();
      } else {
        toast.error(response.error || 'Failed to publish grade');
        console.error('Failed to publish grade:', response.error);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish grade');
      console.error('Error publishing grade:', err);
    }
  };

  // UPDATED: Enhanced batch publishing with verification
  const handlePublishGradesBatch = async (studentIds: string[]) => {
    if (!selectedAssignment || !apiToken || !courseId) return;

    const gradesToPublish = studentIds
      .map(studentId => {
        const studentDataItem = studentData.find(data => data.student.id === studentId);
        if (!studentDataItem || !studentDataItem.currentGrade) return null;
        
        return {
          userId: studentId,
          grade: parseFloat(studentDataItem.currentGrade) || 0,
          feedback: studentDataItem.feedback
        };
      })
      .filter((grade): grade is NonNullable<typeof grade> => grade !== null);

    if (gradesToPublish.length === 0) {
      toast.error('No grades to publish');
      return;
    }

    try {
      const baseUrl = await getMoodleConfig();
      
      // Step 1: Publish grades in batch
      const response = await window.electron.moodleApi.publishGradesBatch({
        baseUrl,
        apiKey: apiToken,
        courseId,
        assignmentId: selectedAssignment,
        grades: gradesToPublish
      });

      if (response.success) {
        toast.success(`${response.data.successCount} grades published successfully`);
        if (response.data.errorCount > 0) {
          toast.warning(`${response.data.errorCount} grades failed to publish`);
        }
        
        // Step 2: Verify each successful grade in Moodle
        const { setGradeSubmission, refreshGradeStatus } = useAutoGradeStore.getState();
        let verifiedCount = 0;
        
        for (const successfulGrade of response.data.successful) {
          const verifiedGrade = await verifyGradeInMoodle(selectedAssignment, successfulGrade.userId);
          
          if (verifiedGrade) {
            const submissionKey = `${selectedAssignment}-${successfulGrade.userId}`;
            setGradeSubmission(submissionKey, {
              studentId: successfulGrade.userId,
              assignmentId: selectedAssignment,
              courseId,
              grade: verifiedGrade.grade,
              feedback: verifiedGrade.feedback || '',
              timestamp: new Date().toISOString(),
              published: true
            });
            
            refreshGradeStatus(selectedAssignment, successfulGrade.userId, verifiedGrade, courseId);
            verifiedCount++;
          }
        }
        
        toast.success(`${verifiedCount} grades verified in Moodle`);
        
        // Step 3: Reload assignment data
        loadAssignmentData();
      } else {
        toast.error(response.error || 'Failed to publish grades');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish grades');
    }
  };

  const handleAdoptAiGrade = (studentId: string) => {
    if (!courseId) return;

    const studentDataItem = studentData.find(data => data.student.id === studentId);
    if (!studentDataItem || !studentDataItem.aiGrade) return;

    setStudentData(prev => prev.map(data => 
      data.student.id === studentId 
        ? { ...data, currentGrade: data.aiGrade || '' }
        : data
    ));

    // FIXED: Persist to hierarchical store
    const currentInfo = getUserGradeInfo(workspaceId, courseId, studentId);
    const updatedInfo = {
      aiGrade: currentInfo?.aiGrade || studentDataItem.aiGrade,
      currentGrade: parseFloat(studentDataItem.aiGrade) || null,
      feedback: currentInfo?.feedback || '',
      timestamp: new Date().toISOString(),
      published: currentInfo?.published || false,
    };
    useAutoGradeStore.getState().setUserGradeInfo(workspaceId, courseId, studentId, updatedInfo);

    toast.success(`AI grade adopted for ${studentDataItem.student.fullname}`);
  };

  const handleResetAiGrade = (studentId: string) => {
    if (!courseId) return;

    const studentDataItem = studentData.find(data => data.student.id === studentId);
    if (!studentDataItem) return;

    setStudentData(prev => prev.map(data => 
      data.student.id === studentId 
        ? { ...data, aiGrade: undefined }
        : data
    ));

    // FIXED: Clear AI grade from hierarchical store
    const currentInfo = getUserGradeInfo(workspaceId, courseId, studentId);
    if (currentInfo) {
      const updatedInfo = {
        ...currentInfo,
        aiGrade: '',
        timestamp: new Date().toISOString(),
      };
      useAutoGradeStore.getState().setUserGradeInfo(workspaceId, courseId, studentId, updatedInfo);
    }

    toast.success(`AI grade reset for ${studentDataItem.student.fullname}`);
  };

  // Handle executeAutoGrade using the store action
  const handleExecuteAutoGrade = async (studentId: string) => {
    const studentDataItem = studentData.find(data => data.student.id === studentId);
    if (!studentDataItem) {
      toast.error('Student data not found');
      return;
    }

    if (!currentMarkingScheme) {
      toast.error('No marking scheme selected. Please select a marking scheme first.');
      return;
    }

    if (!courseId) {
      toast.error('Course ID not found');
      return;
    }

    if (!apiToken) {
      toast.error('API token not found. Please check Moodle settings.');
      return;
    }

    try {
      // Show loading state
      toast.info(`Starting auto-grading for ${studentDataItem.student.fullname}...`);

      // Execute auto-grading using the store action with apiToken
      const result = await executeAutoGrade(
        studentDataItem,
        currentMarkingScheme,
        selectedAssignmentData,
        workspaceId,
        courseId,
        apiToken // Pass the apiToken to the store
      );

      // Update the student data with the result
      setStudentData(prev => prev.map(data => 
        data.student.id === studentId 
          ? { 
              ...data, 
              aiGrade: result.aiGrade,
              feedback: result.feedback
            }
          : data
      ));

      // Explicitly persist to hierarchical store
      const updatedInfo = {
        aiGrade: result.aiGrade,
        currentGrade: studentDataItem.currentGrade ? parseFloat(studentDataItem.currentGrade) : null,
        feedback: result.feedback,
        timestamp: new Date().toISOString(),
        published: false,
      };
      useAutoGradeStore.getState().setUserGradeInfo(workspaceId, courseId, studentId, updatedInfo);

      const maxGrade = selectedAssignmentData?.grade || 100;
      toast.success(`Auto-grading completed for ${studentDataItem.student.fullname}! AI Grade: ${result.aiGrade}/${maxGrade}`);
    } catch (error: any) {
      console.error('Error executing auto-grade:', error);
      toast.error(`Auto-grading failed for ${studentDataItem.student.fullname}: ${error.message}`);
    }
  };

  // UPDATED: Assignment selection handler using modular store
  const handleAssignmentChange = (assignmentId: string) => {
    setSelectedAssignment(workspaceId, assignmentId);
  };

  // UPDATED: Handle grade deletion by resetting state
  const handleDeleteGrade = async (studentId: string) => {
    if (!selectedAssignment || !apiToken || !courseId) return;

    const studentDataItem = studentData.find(data => data.student.id === studentId);
    if (!studentDataItem) return;

    // Check if there's anything to delete
    const hasLocalGrade = studentDataItem.currentGrade && studentDataItem.currentGrade !== '0';
    const hasLocalFeedback = studentDataItem.feedback && studentDataItem.feedback.trim() !== '';
    const hasPublishedGrade = studentDataItem.grade && studentDataItem.grade.grade > 0;
    const hasAiGrade = studentDataItem.aiGrade;

    if (!hasLocalGrade && !hasLocalFeedback && !hasPublishedGrade && !hasAiGrade) {
      toast.info(`No grade or feedback to delete for ${studentDataItem.student.fullname}`);
      return;
    }

    try {
      const baseUrl = await getMoodleConfig();
      
      // Delete from Moodle if there's a published grade
      if (hasPublishedGrade) {
        const response = await window.electron.moodleApi.deleteAssignmentGrade({
          baseUrl,
          apiKey: apiToken,
          assignmentId: selectedAssignment,
          userId: studentId,
          courseId: courseId
        });

        if (!response.success) {
          toast.error(response.error || 'Failed to delete grade from Moodle');
          return;
        }
      }

      // Reset local data to initial state
      setStudentData(prev => prev.map(data => 
        data.student.id === studentId 
          ? { 
              ...data, 
              currentGrade: '', 
              feedback: '',
              aiGrade: undefined,
              isEditing: false // Also reset editing state
            }
          : data
      ));

      // Reset state in stores instead of deleting
      resetUserGrade(workspaceId, courseId, studentId);
      resetGradeSubmission(selectedAssignment, studentId);

      // Also clear legacy auto grade result
      useAutoGradeStore.getState().clearAutoGradeResult(studentId);

      toast.success(`Grade and feedback deleted for ${studentDataItem.student.fullname}`);
      
      // Reload assignment data to update the UI
      loadAssignmentData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete grade');
      console.error('Error deleting grade:', err);
    }
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
      {/* Standardized Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          {intl.formatMessage({ id: "workspace.insights.moodle.tabs.autograde", defaultMessage: "AutoGrade" })}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {intl.formatMessage({ id: "workspace.insights.moodle.tabs.autograde.description", defaultMessage: "Automated grading and feedback system" })}
        </Typography>
      </Box>

      {/* Compact Configuration Section */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            {/* Assignment and KB Selection */}
            <Box sx={{ flex: 1 }}>
              <AssignmentSelector
                assignments={assignments}
                selectedAssignment={selectedAssignment}
                onAssignmentChange={handleAssignmentChange}
                knowledgeBases={knowledgeBases}
                selectedKbId={selectedKbId}
                onKbChange={setSelectedKbId}
                loadingKBs={loadingKBs}
              />
            </Box>
            
            {/* Progress Bars */}
            {selectedAssignment && stats.totalStudents > 0 && (
              <Box sx={{ 
                minWidth: 300,
                p: 1.5,
                bgcolor: 'action.hover',
                borderRadius: 1,
              }}>
                {/* Submission Progress */}
                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {intl.formatMessage({ id: "workspace.insights.moodle.autograde.submissionStatus", defaultMessage: "Submissions" })}
                    </Typography>
                    <Typography variant="caption" color="text.primary" fontWeight="medium">
                      {stats.submitted}/{stats.totalStudents}
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={submissionProgress} 
                    sx={{ 
                      height: 6, 
                      borderRadius: 3,
                      backgroundColor: 'action.selected',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        backgroundColor: 'success.main'
                      }
                    }} 
                  />
                </Box>

                {/* Grading Progress - Now based on published grades */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {intl.formatMessage({ id: "workspace.insights.moodle.autograde.publishedGrades", defaultMessage: "Published Grades" })}
                    </Typography>
                    <Typography variant="caption" color="text.primary" fontWeight="medium">
                      {stats.published}/{stats.totalStudents}
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={gradingProgress} 
                    sx={{ 
                      height: 6, 
                      borderRadius: 3,
                      backgroundColor: 'action.selected',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        backgroundColor: 'primary.main'
                      }
                    }} 
                  />
                  
                  {/* Additional info for pending grades */}
                  {stats.unpublished > 0 && (
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="caption" color="warning.main" fontSize="0.7rem">
                        {intl.formatMessage(
                          { 
                            id: "workspace.insights.moodle.autograde.pendingGrades", 
                            defaultMessage: "{count} grades pending publication" 
                          },
                          { count: stats.unpublished }
                        )}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}
          </Box>

          {/* Marking Scheme Controls */}
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
        </CardContent>
      </Card>

      <MarkingSchemePicker
        open={showAvailableSchemes}
        onClose={() => setShowAvailableSchemes(false)}
        loadingSchemes={loadingSchemes}
        availableSchemes={availableSchemes}
        currentMarkingScheme={currentMarkingScheme}
        knowledgeBases={knowledgeBases}
        selectedKbId={selectedKbId}
        onSelectScheme={handleSelectMarkingScheme}
      />

      {/* Main Focus: Student Table */}
      {selectedAssignment && (
        <Box sx={{ mt: 1 }}>
          {/* Assignment Info - Compact */}
          <AssignmentInfo
            assignment={selectedAssignmentData}
            currentMarkingScheme={currentMarkingScheme}
            knowledgeBases={knowledgeBases}
            stats={stats}
            studentData={studentData}
          />

          {/* Student Table - Main Focus */}
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
            onResetAiGrade={handleResetAiGrade}
            onExecuteAutoGrade={handleExecuteAutoGrade}
            onPublishGrade={handlePublishGrade}
            onDeleteGrade={handleDeleteGrade}
          />
        </Box>
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