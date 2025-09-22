import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Trash2, Plus, Eye, EyeOff, Upload, Download, Database, FileText, Check, X, Calendar, CheckCircle, Circle, GraduationCap, Printer, AlertTriangle } from 'lucide-react';
import { Badge } from './ui/badge';
import { projectId, publicAnonKey, isDevelopmentMode, isSupabaseConfigured } from '../utils/supabase/info';
import { GradeData } from './GradeInput';
import { ImprovedDataPreview } from './ImprovedDataPreview';

interface Account {
  id: string;
  name: string;
  password: string;
}

interface StudentGrades {
  [studentId: string]: GradeData;
}

// 수시 CSV 데이터 구조
interface SusiUniversityData {
  region: string;
  university: string;
  category: string;
  highschool_type: string;
  admission_type: string;
  year: number;
  department: string;
  perfect_score: number;
  convert_50_cut: number;
  convert_70_cut: number;
  grade_50_cut: number;
  grade_70_cut: number;
  recruitment_count: number;
  competition_rate: number;
  additional_pass: number;
  total_apply: number;
  pass_num: number;
  real_competition_rate: number;
}

// 정시 CSV 데이터 구조
interface JeongsiUniversityData {
  region: string;
  university: string;
  category: string;
  admission_type: string;
  year: number;
  department: string;
  perfect_score: number;
  convert_50_cut: number;
  convert_70_cut: number;
  grade_50_cut: number;
  grade_70_cut: number;
  korean: number;
  math: number;
  inquiry: number;
  average: number;
  english: number;
  recruitment_count: number;
  competition_rate: number;
  additional_pass: number;
  total_apply: number;
  pass_num: number;
  real_competition_rate: number;
}

interface CSVFileRecord {
  id: string;
  filename: string;
  uploadDate: string;
  dataCount: number;
  isActive: boolean;
  type: 'susi' | 'jeongsi';
}

interface AdminPanelProps {
  accounts: Account[];
  studentGrades: StudentGrades;
  onAddAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
  onUpdateStudentGrades: (studentId: string, grades: GradeData) => void;
  onBack: () => void;
  onViewPrintReport?: (studentId: string) => void;
}

const ADMIN_PASSWORD = 'admin123';
const GRADE1_SUBJECTS = ['국어', '영어', '수학', '한국사', '사회', '과학'];
const GRADE23_SUBJECTS = [
  '국어1', '국어2', '국어3', 
  '영어1', '영어2', '영어3', 
  '수학1', '수학2', '수학3', 
  '사회1', '사회2', '사회3', 
  '과학1', '과학2', '과학3'
];

const KOREAN_OPTIONS = ['화법과 작문', '언어와 매체'];
const MATH_OPTIONS = ['확률과 통계', '미적분', '기하'];
const INQUIRY_OPTIONS = [
  '생활과 윤리', '윤리와 사상', '한국지리', '세계지리', '동아시아사', '세계사', '경제', '정치와 법', '사회·문화',
  '물리학Ⅰ', '물리학Ⅱ', '화학Ⅰ', '화학Ⅱ', '생명과학Ⅰ', '생명과학Ⅱ', '지구과학Ⅰ', '지구과학Ⅱ'
];
const SECOND_LANGUAGE_OPTIONS = [
  '독일어Ⅰ', '프랑스어Ⅰ', '스페인어Ⅰ', '중국어Ⅰ', '일본어Ⅰ', '러시아어Ⅰ', '아랍어Ⅰ', '베트남어Ⅰ', '한문Ⅰ'
];

export function AdminPanel({ accounts, studentGrades, onAddAccount, onDeleteAccount, onUpdateStudentGrades, onBack, onViewPrintReport }: AdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  // 새 계정 추가 폼 상태
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({ id: '', name: '', password: '' });
  const [addError, setAddError] = useState('');
  
  // 비밀번호 표시/숨김 상태
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});
  
  // 성적 조회/수정 관련 상태
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [isGradeDialogOpen, setIsGradeDialogOpen] = useState(false);
  const [editingGrades, setEditingGrades] = useState<GradeData | null>(null);

  // CSV 파일 관리 상태 (수시/정시 분리)
  const [susiFiles, setSusiFiles] = useState<CSVFileRecord[]>([]);
  const [jeongsiFiles, setJeongsiFiles] = useState<CSVFileRecord[]>([]);
  const [selectedSusiFileId, setSelectedSusiFileId] = useState<string | null>(null);
  const [selectedJeongsiFileId, setSelectedJeongsiFileId] = useState<string | null>(null);
  const [selectedSusiFileData, setSelectedSusiFileData] = useState<SusiUniversityData[]>([]);
  const [selectedJeongsiFileData, setSelectedJeongsiFileData] = useState<JeongsiUniversityData[]>([]);
  const [isUploading, setIsUploading] = useState<{susi: boolean, jeongsi: boolean}>({susi: false, jeongsi: false});
  const [uploadError, setUploadError] = useState<{susi: string, jeongsi: string}>({susi: '', jeongsi: ''});
  const [isLoading, setIsLoading] = useState<{susi: boolean, jeongsi: boolean}>({susi: false, jeongsi: false});
  const [uploadProgress, setUploadProgress] = useState<{susi: string, jeongsi: string}>({susi: '', jeongsi: ''});
  
  // 파일 입력 참조
  const susiFileInputRef = useRef<HTMLInputElement>(null);
  const jeongsiFileInputRef = useRef<HTMLInputElement>(null);

  // 기존 상태들 뒤에 추가
const [sortBy, setSortBy] = useState<string>('id');
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [headers, setHeaders] = useState<string[]>([]);
const [totalCount, setTotalCount] = useState(0);

  // 계산 로직 디버깅 관련 상태
  const [testResults, setTestResults] = useState<any>(null);

  // 컴포넌트 마운트 시 CSV 파일 목록 로드 (개발 모드가 아닐 때만)
  useEffect(() => {
    if (isAuthenticated && !isDevelopmentMode()) {
      loadCSVFiles('susi');
      loadCSVFiles('jeongsi');
    } else if (isAuthenticated && isDevelopmentMode()) {
      // 개발 모드에서는 빈 파일 목록 설정
      setSusiFiles([]);
      setJeongsiFiles([]);
      console.log('개발 모드: CSV 파일 로드를 건너뜁니다.');
    }
  }, [isAuthenticated]);

  // CSV 파일 목록 로드 (개발 모드에서는 호출하지 않음)
  const loadCSVFiles = async (type: 'susi' | 'jeongsi') => {
    if (isDevelopmentMode()) {
      console.log(`개발 모드: ${type} 파일 로드를 건너뜁니다.`);
      return;
    }

    try {
      setIsLoading(prev => ({...prev, [type]: true}));
      console.log(`Loading ${type} files...`);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-72188212/csv-files/${type}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`${type} files result:`, result);
      
      if (result.files && Array.isArray(result.files)) {
        const files = result.files;
        if (type === 'susi') {
          setSusiFiles(files);
          const activeFile = files.find((file: CSVFileRecord) => file.isActive);
          if (activeFile) {
            setSelectedSusiFileId(activeFile.id);
            loadFileData('susi', activeFile.id);
          }
        } else {
          setJeongsiFiles(files);
          const activeFile = files.find((file: CSVFileRecord) => file.isActive);
          if (activeFile) {
            setSelectedJeongsiFileId(activeFile.id);
            loadFileData('jeongsi', activeFile.id);
          }
        }
      } else {
        console.warn(`${type} files result does not contain valid files array:`, result);
        if (type === 'susi') {
          setSusiFiles([]);
        } else {
          setJeongsiFiles([]);
        }
      }
    } catch (error) {
      console.error(`${type} CSV 파일 목록 로드 오류:`, error);
      setUploadError(prev => ({...prev, [type]: `파일 목록 로드 실패: ${error.message}`}));
      // 빈 배열로 설정하여 에러 방지
      if (type === 'susi') {
        setSusiFiles([]);
      } else {
        setJeongsiFiles([]);
      }
    } finally {
      setIsLoading(prev => ({...prev, [type]: false}));
    }
  };

  // 특정 파일 데이터 로드 (개발 모드에서는 호출하지 않음)
  const loadFileData = async (type: 'susi' | 'jeongsi', fileId: string) => {
    if (isDevelopmentMode()) {
      console.log(`개발 모드: ${type} 파일 데이터 로드를 건너뜁니다.`);
      return;
    }

    try {
      console.log(`Loading ${type} file data for ${fileId}...`);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-72188212/csv-data/${type}/${fileId}?page=${currentPage}&limit=100&sortBy=${sortBy}&sortOrder=${sortOrder}`, {
  headers: {
    'Authorization': `Bearer ${publicAnonKey}`
  }
});
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`${type} file data loaded:`, result.data?.length || 0, 'records');
      
      if (result.data && Array.isArray(result.data)) {
  if (type === 'susi') {
    setSelectedSusiFileData(result.data);
  } else {
    setSelectedJeongsiFileData(result.data);
  }
  
  // 새로운 상태 업데이트
  setHeaders(result.headers || []);
  setTotalCount(result.totalCount || 0);
  setTotalPages(result.pagination?.totalPages || 1);
} else {
        console.warn(`${type} file data is not a valid array:`, result);
        if (type === 'susi') {
          setSelectedSusiFileData([]);
        } else {
          setSelectedJeongsiFileData([]);
        }
      }
    } catch (error) {
      console.error(`${type} 파일 데이터 로드 오류:`, error);
      if (type === 'susi') {
        setSelectedSusiFileData([]);
      } else {
        setSelectedJeongsiFileData([]);
      }
    }
  };

  // 수시 CSV 파일 파싱
  const parseSusiCSV = (csvText: string): SusiUniversityData[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const data: SusiUniversityData[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length >= 18) {
        try {
          const row: SusiUniversityData = {
            region: values[0] || '',
            university: values[1] || '',
            category: values[2] || '',
            highschool_type: values[3] || '',
            admission_type: values[4] || '',
            year: parseInt(values[5]) || 2024,
            department: values[6] || '',
            perfect_score: parseFloat(values[7]) || 0,
            convert_50_cut: parseFloat(values[8]) || 0,
            convert_70_cut: parseFloat(values[9]) || 0,
            grade_50_cut: parseFloat(values[10]) || 0,
            grade_70_cut: parseFloat(values[11]) || 0,
            recruitment_count: parseInt(values[12]) || 0,
            competition_rate: parseFloat(values[13]) || 0,
            additional_pass: parseInt(values[14]) || 0,
            total_apply: parseInt(values[15]) || 0,
            pass_num: parseInt(values[16]) || 0,
            real_competition_rate: parseFloat(values[17]) || 0
          };
          data.push(row);
        } catch (error) {
          console.warn(`수시 CSV 행 파싱 오류 (라인 ${i}):`, error);
        }
      }
    }
    
    return data;
  };

  // 정시 CSV 파일 파싱
  const parseJeongsiCSV = (csvText: string): JeongsiUniversityData[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const data: JeongsiUniversityData[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length >= 22) {
        try {
          const row: JeongsiUniversityData = {
            region: values[0] || '',
            university: values[1] || '',
            category: values[2] || '',
            admission_type: values[3] || '',
            year: parseInt(values[4]) || 2024,
            department: values[5] || '',
            perfect_score: parseFloat(values[6]) || 0,
            convert_50_cut: parseFloat(values[7]) || 0,
            convert_70_cut: parseFloat(values[8]) || 0,
            grade_50_cut: parseFloat(values[9]) || 0,
            grade_70_cut: parseFloat(values[10]) || 0,
            korean: parseFloat(values[11]) || 0,
            math: parseFloat(values[12]) || 0,
            inquiry: parseFloat(values[13]) || 0,
            average: parseFloat(values[14]) || 0,
            english: parseFloat(values[15]) || 0,
            recruitment_count: parseInt(values[16]) || 0,
            competition_rate: parseFloat(values[17]) || 0,
            additional_pass: parseInt(values[18]) || 0,
            total_apply: parseInt(values[19]) || 0,
            pass_num: parseInt(values[20]) || 0,
            real_competition_rate: parseFloat(values[21]) || 0
          };
          data.push(row);
        } catch (error) {
          console.warn(`정시 CSV 행 파싱 오류 (라인 ${i}):`, error);
        }
      }
    }
    
    return data;
  };

  // 파일 업로드 처리 함수 수정 (개발 모드에서는 제한된 기능)
  const processFileUpload = async (type: 'susi' | 'jeongsi', file: File) => {
    console.log(`Processing ${type} file upload:`, file.name);
    
    if (isDevelopmentMode()) {
      setUploadError(prev => ({...prev, [type]: '개발 모드에서는 파일 업로드가 지원되지 않습니다. Supabase 환경변수를 설정해주세요.'}));
      return;
    }
    
    if (!file.name.endsWith('.csv')) {
      setUploadError(prev => ({...prev, [type]: 'CSV 파일만 업로드 가능합니다.'}));
      return;
    }

    // 파일 크기 체크 (10MB 제한)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setUploadError(prev => ({...prev, [type]: '파일 크기가 너무 큽니다. 10MB 이하의 파일을 선택해주세요.'}));
      return;
    }

    setIsUploading(prev => ({...prev, [type]: true}));
    setUploadError(prev => ({...prev, [type]: ''}));
    setUploadProgress(prev => ({...prev, [type]: '파일을 읽는 중...'}));

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        console.log(`Reading ${type} file content...`);
        setUploadProgress(prev => ({...prev, [type]: '파일 내용을 분석하는 중...'}));
        
        const csvText = e.target?.result as string;
        const data = type === 'susi' ? parseSusiCSV(csvText) : parseJeongsiCSV(csvText);
        
        console.log(`Parsed ${type} data:`, data.length, 'rows');
        
        if (data.length === 0) {
          setUploadError(prev => ({...prev, [type]: '유효한 데이터가 없습니다. CSV 파일 형식을 확인해주세요.'}));
          setIsUploading(prev => ({...prev, [type]: false}));
          setUploadProgress(prev => ({...prev, [type]: ''}));
          return;
        }

        if (data.length > 1000) {
          setUploadProgress(prev => ({...prev, [type]: `대용량 데이터 처리 중... (${data.length}개 레코드)`}));
        } else {
          setUploadProgress(prev => ({...prev, [type]: '서버에 업로드 중...'}));
        }

        console.log(`Uploading ${type} data to server...`);
        
        // 서버에 업로드
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-72188212/upload-csv-file/${type}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`
  },
  body: JSON.stringify({
    filename: file.name,
    csvData: data
  })
});

        const result = await response.json();
        console.log(`Upload ${type} result:`, result);
        
        if (response.ok) {
          console.log(`Successfully uploaded ${type} file`);
          setUploadProgress(prev => ({...prev, [type]: '업로드 완료! 파일 목록을 새로고침 중...'}));
          await loadCSVFiles(type); // 목록 새로고침
          setUploadProgress(prev => ({...prev, [type]: ''}));
          setIsUploading(prev => ({...prev, [type]: false}));
        } else {
          console.error(`Upload ${type} error:`, result.error);
          setUploadError(prev => ({...prev, [type]: result.error || result.details || '업로드에 실패했습니다.'}));
          setUploadProgress(prev => ({...prev, [type]: ''}));
          setIsUploading(prev => ({...prev, [type]: false}));
        }
      } catch (error) {
        console.error(`File processing error for ${type}:`, error);
        setUploadError(prev => ({...prev, [type]: `파일 처리 중 오류가 발생했습니다: ${error.message}`}));
        setUploadProgress(prev => ({...prev, [type]: ''}));
        setIsUploading(prev => ({...prev, [type]: false}));
      }
    };

    reader.onerror = () => {
      console.error(`File reading error for ${type}`);
      setUploadError(prev => ({...prev, [type]: '파일 읽기 중 오류가 발생했습니다.'}));
      setUploadProgress(prev => ({...prev, [type]: ''}));
      setIsUploading(prev => ({...prev, [type]: false}));
    };

    reader.readAsText(file, 'UTF-8');
  };

  // 파일 선택 처리 함수
  const handleFileSelect = (type: 'susi' | 'jeongsi') => {
    console.log(`Opening file dialog for ${type}`);
    const fileInput = type === 'susi' ? susiFileInputRef.current : jeongsiFileInputRef.current;
    if (fileInput) {
      fileInput.click();
    }
  };

  // 파일 변경 처리 함수
  const handleFileChange = (type: 'susi' | 'jeongsi') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log(`File change event for ${type}:`, file?.name);
    
    if (file) {
      processFileUpload(type, file);
    }
    
    // 파일 입력 초기화
    event.target.value = '';
  };

// 새로운 함수 추가
const handleSort = (column: string) => {
  if (sortBy === column) {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  } else {
    setSortBy(column);
    setSortOrder('asc');
  }
  // 데이터 다시 로드
  if (selectedSusiFileId) {
    loadFileData('susi', selectedSusiFileId);
  } else if (selectedJeongsiFileId) {
    loadFileData('jeongsi', selectedJeongsiFileId);
  }
};

const handlePageChange = (page: number) => {
  setCurrentPage(page);
  if (selectedSusiFileId) {
    loadFileData('susi', selectedSusiFileId);
  } else if (selectedJeongsiFileId) {
    loadFileData('jeongsi', selectedJeongsiFileId);
  }
};

  
  // 파일 적용 (개발 모드에서는 호출하지 않음)
  const handleApplyFile = async (type: 'susi' | 'jeongsi', fileId: string) => {
    if (isDevelopmentMode()) {
      console.log(`개발 모드: ${type} 파일 적용을 건너뜁니다.`);
      return;
    }

    try {
      console.log(`Applying ${type} file ${fileId}...`);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-72188212/apply-csv-file/${type}/${fileId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (response.ok) {
        await loadCSVFiles(type); // 목록 새로고침
        console.log(`Successfully applied ${type} file`);
      } else {
        const result = await response.json();
        console.error(`Failed to apply ${type} file:`, result);
      }
    } catch (error) {
      console.error(`${type} 파일 적용 오류:`, error);
    }
  };

  // 파일 삭제 (개발 모드에서는 호출하지 않음)
  const handleDeleteFile = async (type: 'susi' | 'jeongsi', fileId: string) => {
    if (isDevelopmentMode()) {
      console.log(`개발 모드: ${type} 파일 삭제를 건너뜁니다.`);
      return;
    }

    try {
      console.log(`Deleting ${type} file ${fileId}...`);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-72188212/csv-file/${type}/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (response.ok) {
        await loadCSVFiles(type); // 목록 새로고침
        if (type === 'susi' && selectedSusiFileId === fileId) {
          setSelectedSusiFileId(null);
          setSelectedSusiFileData([]);
        } else if (type === 'jeongsi' && selectedJeongsiFileId === fileId) {
          setSelectedJeongsiFileId(null);
          setSelectedJeongsiFileData([]);
        }
        console.log(`Successfully deleted ${type} file`);
      } else {
        const result = await response.json();
        console.error(`Failed to delete ${type} file:`, result);
      }
    } catch (error) {
      console.error(`${type} 파일 삭제 오류:`, error);
    }
  };

  // 파일 다운로드 (개발 모드에서는 호출하지 않음)
  const handleDownloadFile = async (type: 'susi' | 'jeongsi', file: CSVFileRecord) => {
    if (isDevelopmentMode()) {
      console.log(`개발 모드: ${type} 파일 다운로드를 건너뜁니다.`);
      return;
    }

    try {
      console.log(`Downloading ${type} file ${file.id}...`);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-72188212/csv-data/${type}/${file.id}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      
      const result = await response.json();
      if (response.ok && result.data && Array.isArray(result.data)) {
        let csvContent = '';
        
        if (type === 'susi') {
          csvContent = [
            'region,university,category,highschool_type,admission_type,year,department,perfect_score,convert_50_cut,convert_70_cut,grade_50_cut,grade_70_cut,recruitment_count,competition_rate,additional_pass,total_apply,pass_num,real_competition_rate',
            ...result.data.map((row: SusiUniversityData) => 
              `${row.region},${row.university},${row.category},${row.highschool_type},${row.admission_type},${row.year},${row.department},${row.perfect_score},${row.convert_50_cut},${row.convert_70_cut},${row.grade_50_cut},${row.grade_70_cut},${row.recruitment_count},${row.competition_rate},${row.additional_pass},${row.total_apply},${row.pass_num},${row.real_competition_rate}`
            )
          ].join('\n');
        } else {
          csvContent = [
            'region,university,category,admission_type,year,department,perfect_score,convert_50_cut,convert_70_cut,grade_50_cut,grade_70_cut,korean,math,inquiry,average,english,recruitment_count,competition_rate,additional_pass,total_apply,pass_num,real_competition_rate',
            ...result.data.map((row: JeongsiUniversityData) => 
              `${row.region},${row.university},${row.category},${row.admission_type},${row.year},${row.department},${row.perfect_score},${row.convert_50_cut},${row.convert_70_cut},${row.grade_50_cut},${row.grade_70_cut},${row.korean},${row.math},${row.inquiry},${row.average},${row.english},${row.recruitment_count},${row.competition_rate},${row.additional_pass},${row.total_apply},${row.pass_num},${row.real_competition_rate}`
            )
          ].join('\n');
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', file.filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`Successfully downloaded ${type} file`);
      } else {
        console.error(`Failed to download ${type} file:`, result);
      }
    } catch (error) {
      console.error(`${type} 파일 다운로드 오류:`, error);
    }
  };

  // 파일 선택 및 데이터 미리보기
  const handleFileDataSelect = (type: 'susi' | 'jeongsi', fileId: string) => {
    if (type === 'susi') {
      setSelectedSusiFileId(fileId);
    } else {
      setSelectedJeongsiFileId(fileId);
    }
    loadFileData(type, fileId);
  };

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('관리자 비밀번호가 올바르지 않습니다.');
    }
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (!newAccount.id || !newAccount.name || !newAccount.password) {
      setAddError('모든 필드를 입력해주세요.');
      return;
    }

    if (accounts.some(acc => acc.id === newAccount.id)) {
      setAddError('이미 존재하는 아이디입니다.');
      return;
    }

    onAddAccount(newAccount);
    setNewAccount({ id: '', name: '', password: '' });
    setIsAddDialogOpen(false);
  };

  const togglePasswordVisibility = (accountId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 수시 데이터 테이블 렌더링
  const renderSusiDataTable = (data: SusiUniversityData[]) => {
    if (data.length === 0) {
      return (
        <div className="text-center py-8 text-navy-500">
          데이터가 없습니다. 파일을 선택해주세요.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>지역</TableHead>
              <TableHead>대학</TableHead>
              <TableHead>학과</TableHead>
              <TableHead>전형</TableHead>
              <TableHead>연도</TableHead>
              <TableHead>등급 50%</TableHead>
              <TableHead>등급 70%</TableHead>
              <TableHead>모집인원</TableHead>
              <TableHead>경쟁률</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 20).map((row, index) => (
              <TableRow key={index}>
                <TableCell className="text-sm">{row.region}</TableCell>
                <TableCell className="font-medium">{row.university}</TableCell>
                <TableCell>{row.department}</TableCell>
                <TableCell className="text-sm">{row.admission_type}</TableCell>
                <TableCell>{row.year}</TableCell>
                <TableCell>{row.grade_50_cut > 0 ? `${row.grade_50_cut}등급` : '-'}</TableCell>
                <TableCell>{row.grade_70_cut > 0 ? `${row.grade_70_cut}등급` : '-'}</TableCell>
                <TableCell>{row.recruitment_count}</TableCell>
                <TableCell>{row.competition_rate}:1</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data.length > 20 && (
          <div className="text-center py-2 text-sm text-navy-500">
            ... 총 {data.length}개 데이터 중 20개 표시
          </div>
        )}
      </div>
    );
  };

  // 정시 데이터 테이블 렌더링
  const renderJeongsiDataTable = (data: JeongsiUniversityData[]) => {
    if (data.length === 0) {
      return (
        <div className="text-center py-8 text-navy-500">
          데이터가 없습니다. 파일을 선택해주세요.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>지역</TableHead>
              <TableHead>대학</TableHead>
              <TableHead>학과</TableHead>
              <TableHead>전형</TableHead>
              <TableHead>연도</TableHead>
              <TableHead>국어</TableHead>
              <TableHead>수학</TableHead>
              <TableHead>영어</TableHead>
              <TableHead>탐구</TableHead>
              <TableHead>모집인원</TableHead>
              <TableHead>경쟁률</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 20).map((row, index) => (
              <TableRow key={index}>
                <TableCell className="text-sm">{row.region}</TableCell>
                <TableCell className="font-medium">{row.university}</TableCell>
                <TableCell>{row.department}</TableCell>
                <TableCell className="text-sm">{row.admission_type}</TableCell>
                <TableCell>{row.year}</TableCell>
                <TableCell>{row.korean > 0 ? row.korean : '-'}</TableCell>
                <TableCell>{row.math > 0 ? row.math : '-'}</TableCell>
                <TableCell>{row.english > 0 ? row.english : '-'}</TableCell>
                <TableCell>{row.inquiry > 0 ? row.inquiry : '-'}</TableCell>
                <TableCell>{row.recruitment_count}</TableCell>
                <TableCell>{row.competition_rate}:1</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data.length > 20 && (
          <div className="text-center py-2 text-sm text-navy-500">
            ... 총 {data.length}개 데이터 중 20개 표시
          </div>
        )}
      </div>
    );
  };

  // CSV 파일 섹션 렌더링 (개선된 버전)
  const renderCSVFileSection = (type: 'susi' | 'jeongsi') => {
    const files = type === 'susi' ? susiFiles : jeongsiFiles;
    const selectedFileId = type === 'susi' ? selectedSusiFileId : selectedJeongsiFileId;
    const selectedFileData = type === 'susi' ? selectedSusiFileData : selectedJeongsiFileData;
    const uploading = isUploading[type];
    const loading = isLoading[type];
    const error = uploadError[type];
    const progress = uploadProgress[type];
    const typeLabel = type === 'susi' ? '수시' : '정시';

    const expectedFormat = type === 'susi' 
      ? 'region,university,category,highschool_type,admission_type,year,department,perfect_score,convert_50_cut,convert_70_cut,grade_50_cut,grade_70_cut,recruitment_count,competition_rate,additional_pass,total_apply,pass_num,real_competition_rate'
      : 'region,university,category,admission_type,year,department,perfect_score,convert_50_cut,convert_70_cut,grade_50_cut,grade_70_cut,korean,math,inquiry,average,english,recruitment_count,competition_rate,additional_pass,total_apply,pass_num,real_competition_rate';

    return (
      <div className="space-y-6">
        {/* 파일 업로드 섹션 */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-navy-800 flex items-center">
              <Upload className="w-5 h-5 mr-2 text-gold-600" />
              {typeLabel} CSV 파일 업로드
            </CardTitle>
            <p className="text-navy-600 text-sm">
              {typeLabel} 입시 데이터가 포함된 CSV 파일을 업로드하세요. 최대 10개 파일까지 관리할 수 있습니다.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {progress && (
                <Alert>
                  <AlertDescription className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gold-600 mr-2"></div>
                    {progress}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex items-center space-x-4">
                {/* 숨겨진 파일 입력 */}
                <input
                  ref={type === 'susi' ? susiFileInputRef : jeongsiFileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange(type)}
                  style={{ display: 'none' }}
                />
                
                {/* 파일 선택 버튼 */}
                <Button 
                  onClick={() => handleFileSelect(type)}
                  disabled={uploading || loading}
                  className={`${uploading ? 'bg-gray-400' : 'bg-gold-600 hover:bg-gold-700'}`}
                >
                  {uploading ? `${typeLabel} 업로드 중...` : `${typeLabel} 파일 선택`}
                </Button>
                
                <span className="text-sm text-navy-600">
                  {uploading ? '파일을 처리하고 있습니다...' : 'CSV 파일을 선택해주세요 (최대 10MB)'}
                </span>
              </div>
              
              <div className="text-sm text-navy-600">
                <p>{typeLabel} CSV 파일 형식 예시:</p>
                <code className="block bg-navy-100 p-2 rounded mt-1 text-xs break-all">
                  {expectedFormat}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 파일 목록 섹션 */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-navy-800 flex items-center">
              <Database className="w-5 h-5 mr-2 text-gold-600" />
              업로드된 {typeLabel} CSV 파일 목록
            </CardTitle>
            <p className="text-navy-600 text-sm">
              업로드된 {typeLabel} 파일들을 관리하고 활성화할 파일을 선택하세요.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-navy-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-600 mx-auto mb-2"></div>
                로딩 중...
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8 text-navy-500">
                업로드된 {typeLabel} 파일이 없습니다. CSV 파일을 업로드해주세요.
              </div>
            ) : (
              <div className="space-y-4">
                {files.map((file) => (
                  <div 
                    key={file.id} 
                    className={`p-4 border rounded-lg ${file.isActive ? 'border-gold-400 bg-gold-50' : 'border-navy-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {file.isActive ? (
                          <CheckCircle className="w-5 h-5 text-gold-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-navy-400" />
                        )}
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-navy-800">{file.filename}</h4>
                            {file.isActive && (
                              <Badge variant="secondary" className="bg-gold-100 text-gold-800">
                                현재 적용중
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-navy-600">
                            <div className="flex items-center space-x-4">
                              <span className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {formatDate(file.uploadDate)}
                              </span>
                              <span>{file.dataCount}개 데이터</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFileDataSelect(type, file.id)}
                          className="border-navy-300 text-navy-700 hover:bg-navy-50"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          미리보기
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadFile(type, file)}
                          className="border-navy-300 text-navy-700 hover:bg-navy-50"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          다운로드
                        </Button>
                        
                        {!file.isActive && (
                          <Button
                            size="sm"
                            onClick={() => handleApplyFile(type, file.id)}
                            className="bg-gold-600 hover:bg-gold-700"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            적용
                          </Button>
                        )}
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              disabled={file.isActive}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>파일 삭제</AlertDialogTitle>
                              <AlertDialogDescription>
                                {file.filename} 파일을 삭제하시겠습니까? 
                                이 작업은 되돌릴 수 없습니다.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>취소</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteFile(type, file.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                삭제
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 데이터 미리보기 섹션 */}
        {selectedFileId && selectedFileData.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-navy-800 flex items-center">
                <Eye className="w-5 h-5 mr-2 text-gold-600" />
                {typeLabel} 데이터 미리보기
              </CardTitle>
              <p className="text-navy-600 text-sm">
                선택한 {typeLabel} 파일의 데이터 내용을 확인할 수 있습니다.
              </p>
            </CardHeader>
            <CardContent>
              <ImprovedDataPreview
  data={type === 'susi' ? selectedSusiFileData : selectedJeongsiFileData}
  headers={headers}
  totalCount={totalCount}
  type={type}
  onSort={handleSort}
  onPageChange={handlePageChange}
  currentPage={currentPage}
  totalPages={totalPages}
  sortBy={sortBy}
  sortOrder={sortOrder}
/>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // 학생 성적 관리 관련 함수들 (기존 코드와 동일)
  const openGradeDialog = (studentId: string) => {
    setSelectedStudent(studentId);
    const defaultGrades: GradeData = {
      personalInfo: {
        name: '',
        address: '',
        schoolType: '',
        trackType: '',
        preferredMajor1: '',
        preferredMajor2: '',
        preferredMajor3: '',
        customMajor: ''
      },
      school: {
        grade1: { semester1: {}, semester2: {} },
        grade2: { semester1: {}, semester2: {} },
        grade3: { semester1: {}, semester2: {} }
      },
      suneung: {
        korean: { standardScore: 0, percentile: 0, grade: 0, selectedOption: '' },
        math: { standardScore: 0, percentile: 0, grade: 0, selectedOption: '' },
        english: { standardScore: 0, percentile: 0, grade: 0 },
        koreanHistory: { standardScore: 0, percentile: 0, grade: 0 },
        inquiry1: { standardScore: 0, percentile: 0, grade: 0, selectedOption: '' },
        inquiry2: { standardScore: 0, percentile: 0, grade: 0, selectedOption: '' },
        secondLanguage: { standardScore: 0, percentile: 0, grade: 0, selectedOption: '' }
      }
    };

    let currentGrades = studentGrades[studentId] || defaultGrades;
    
    // 기존 데이터 호환성을 위해 inquiry가 있으면 inquiry1으로 이동
    if ('inquiry' in currentGrades.suneung && !('inquiry1' in currentGrades.suneung)) {
      currentGrades = {
        ...currentGrades,
        suneung: {
          ...currentGrades.suneung,
          inquiry1: (currentGrades.suneung as any).inquiry,
          inquiry2: { standardScore: 0, percentile: 0, grade: 0, selectedOption: '' }
        }
      };
      delete (currentGrades.suneung as any).inquiry;
    }
    
    setEditingGrades(currentGrades);
    setIsGradeDialogOpen(true);
  };

  const handleSchoolGradeUpdate = (gradeLevel: keyof GradeData['school'], semester: 'semester1' | 'semester2', subject: string, field: 'grade' | 'credits', value: string) => {
    if (!editingGrades) return;
    
    const numValue = parseInt(value) || 0;
    setEditingGrades(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        school: {
          ...prev.school,
          [gradeLevel]: {
            ...prev.school[gradeLevel],
            [semester]: {
              ...prev.school[gradeLevel][semester],
              [subject]: {
                ...prev.school[gradeLevel][semester][subject],
                [field]: numValue,
                grade: field === 'grade' ? numValue : prev.school[gradeLevel][semester][subject]?.grade || 0,
                credits: field === 'credits' ? numValue : prev.school[gradeLevel][semester][subject]?.credits || 0
              }
            }
          }
        }
      };
    });
  };

  const handleSuneungGradeUpdate = (subject: keyof GradeData['suneung'], field: string, value: string) => {
    if (!editingGrades) return;
    
    setEditingGrades(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        suneung: {
          ...prev.suneung,
          [subject]: {
            ...prev.suneung[subject],
            [field]: field === 'selectedOption' ? value : (parseInt(value) || 0)
          }
        }
      };
    });
  };

  const saveGrades = () => {
    if (selectedStudent && editingGrades) {
      onUpdateStudentGrades(selectedStudent, editingGrades);
      setIsGradeDialogOpen(false);
      setSelectedStudent(null);
      setEditingGrades(null);
    }
  };

  // 계산 로직 테스트 함수
  const handleTestLogic = async () => {
    try {
      // 테스트용 학생 데이터 생성
      const testStudentData = {
        name: "테스트 학생",
        schoolType: "일반고" as const,
        schoolGrades: {
          grade1: { semester1: {}, semester2: {} },
          grade2: { semester1: {}, semester2: {} },
          grade3: { semester1: {}, semester2: {} }
        },
        suneungGrades: {
          korean: { grade: 3, standardScore: 120, percentile: 85 },
          math: { grade: 2, standardScore: 130, percentile: 90 },
          english: { grade: 4, standardScore: 110, percentile: 80 },
          koreanHistory: { grade: 3, standardScore: 115, percentile: 82 },
          inquiry1: { grade: 2, standardScore: 125, percentile: 88 },
          inquiry2: { grade: 3, standardScore: 118, percentile: 83 }
        },
        preferredUniversities: ["서울대학교", "연세대학교"],
        preferredMajors: ["컴퓨터공학과", "경영학과"],
        preferredRegions: ["서울", "경기"]
      };

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/calculate-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          studentData: testStudentData,
          debugMode: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        setTestResults(result);
        console.log('테스트 결과:', result);
      } else {
        const error = await response.json();
        console.error('테스트 실패:', error);
        setTestResults({ error: error.message || '테스트 실패' });
      }
    } catch (error) {
      console.error('테스트 오류:', error);
      setTestResults({ error: error.message || '테스트 오류' });
    }
  };

  // 데이터베이스 상태 확인 함수
  const handleCheckDatabase = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/calculate-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          studentData: {
            name: "DB 체크",
            schoolType: "일반고",
            schoolGrades: { grade1: { semester1: {}, semester2: {} }, grade2: { semester1: {}, semester2: {} }, grade3: { semester1: {}, semester2: {} } },
            suneungGrades: { korean: { grade: 0, standardScore: 0, percentile: 0 }, math: { grade: 0, standardScore: 0, percentile: 0 }, english: { grade: 0, standardScore: 0, percentile: 0 }, koreanHistory: { grade: 0, standardScore: 0, percentile: 0 }, inquiry1: { grade: 0, standardScore: 0, percentile: 0 }, inquiry2: { grade: 0, standardScore: 0, percentile: 0 } }
          },
          debugMode: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        setTestResults(result.debugInfo);
        console.log('DB 상태:', result.debugInfo);
      } else {
        const error = await response.json();
        console.error('DB 체크 실패:', error);
        setTestResults({ error: error.message || 'DB 체크 실패' });
      }
    } catch (error) {
      console.error('DB 체크 오류:', error);
      setTestResults({ error: error.message || 'DB 체크 오류' });
    }
  };

  const renderSchoolGradeEditForm = () => {
    if (!editingGrades) return null;

    const renderSubjectInputs = (gradeLevel: keyof GradeData['school'], semester: 'semester1' | 'semester2', subjects: string[]) => {
      return subjects.map(subject => (
        <div key={subject} className="grid grid-cols-3 gap-4 items-center p-3 border border-navy-200 rounded">
          <div className="text-sm font-medium text-navy-700">{subject}</div>
          <div className="space-y-1">
            <Label className="text-xs text-navy-600">등급</Label>
            <Select onValueChange={(value) => handleSchoolGradeUpdate(gradeLevel, semester, subject, 'grade', value)}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder={editingGrades.school[gradeLevel][semester][subject]?.grade?.toString() || "등급"} />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(grade => (
                  <SelectItem key={grade} value={grade.toString()}>
                    {grade}등급
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-navy-600">이수단위</Label>
            <Input
              type="number"
              min="1"
              max="8"
              className="h-8"
              placeholder="단위"
              value={editingGrades.school[gradeLevel][semester][subject]?.credits || ''}
              onChange={(e) => handleSchoolGradeUpdate(gradeLevel, semester, subject, 'credits', e.target.value)}
            />
          </div>
        </div>
      ));
    };

    return (
      <Tabs defaultValue="grade1" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="grade1">1학년</TabsTrigger>
          <TabsTrigger value="grade2">2학년</TabsTrigger>
          <TabsTrigger value="grade3">3학년</TabsTrigger>
        </TabsList>

        <TabsContent value="grade1" className="space-y-4">
          <div>
            <h4 className="font-medium mb-2 text-navy-700">1학년 1학기</h4>
            <div className="space-y-2">
              {renderSubjectInputs('grade1', 'semester1', GRADE1_SUBJECTS)}
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2 text-navy-700">1학년 2학기</h4>
            <div className="space-y-2">
              {renderSubjectInputs('grade1', 'semester2', GRADE1_SUBJECTS)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="grade2" className="space-y-4">
          <div>
            <h4 className="font-medium mb-2 text-navy-700">2학년 1학기</h4>
            <div className="space-y-2">
              {renderSubjectInputs('grade2', 'semester1', GRADE23_SUBJECTS)}
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2 text-navy-700">2학년 2학기</h4>
            <div className="space-y-2">
              {renderSubjectInputs('grade2', 'semester2', GRADE23_SUBJECTS)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="grade3" className="space-y-4">
          <div>
            <h4 className="font-medium mb-2 text-navy-700">3학년 1학기</h4>
            <div className="space-y-2">
              {renderSubjectInputs('grade3', 'semester1', GRADE23_SUBJECTS)}
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2 text-navy-700">3학년 2학기</h4>
            <div className="space-y-2">
              {renderSubjectInputs('grade3', 'semester2', GRADE23_SUBJECTS)}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    );
  };

  const renderSuneungGradeEditForm = () => {
    if (!editingGrades) return null;

    const renderSuneungSubject = (subject: keyof GradeData['suneung'], subjectName: string, options?: string[]) => {
      const subjectData = editingGrades.suneung[subject];
      
      return (
        <div key={subject} className="p-4 border border-navy-200 rounded-lg space-y-3">
          <h4 className="font-medium text-center text-navy-700">{subjectName}</h4>
          
          {options && (
            <div className="space-y-1">
              <Label className="text-xs text-navy-600">선택과목</Label>
              <Select 
                value={subjectData.selectedOption || ''} 
                onValueChange={(value) => handleSuneungGradeUpdate(subject, 'selectedOption', value)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="선택과목" />
                </SelectTrigger>
                <SelectContent>
                  {options.map(option => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-navy-600">표준점수</Label>
              <Input
                type="number"
                className="h-8"
                value={subjectData.standardScore || ''}
                onChange={(e) => handleSuneungGradeUpdate(subject, 'standardScore', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-navy-600">백분위</Label>
              <Input
                type="number"
                className="h-8"
                value={subjectData.percentile || ''}
                onChange={(e) => handleSuneungGradeUpdate(subject, 'percentile', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-navy-600">등급</Label>
              <Select 
                value={subjectData.grade?.toString() || ''} 
                onValueChange={(value) => handleSuneungGradeUpdate(subject, 'grade', value)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="등급" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(grade => (
                    <SelectItem key={grade} value={grade.toString()}>
                      {grade}등급
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderSuneungSubject('korean', '국어', KOREAN_OPTIONS)}
        {renderSuneungSubject('math', '수학', MATH_OPTIONS)}
        {renderSuneungSubject('english', '영어')}
        {renderSuneungSubject('koreanHistory', '한국사')}
        {renderSuneungSubject('inquiry1', '탐구1', INQUIRY_OPTIONS)}
        {renderSuneungSubject('inquiry2', '탐구2', INQUIRY_OPTIONS)}
        {renderSuneungSubject('secondLanguage', '제2외국어/한문', SECOND_LANGUAGE_OPTIONS)}
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gold-50 to-gold-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-navy-800 to-navy-900 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <CardTitle className="text-2xl text-navy-800">관리자 인증</CardTitle>
            <p className="text-navy-600 mt-2">관리자 비밀번호를 입력해주세요</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminAuth} className="space-y-4">
              {authError && (
                <Alert variant="destructive">
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="adminPassword" className="text-navy-700">관리자 비밀번호</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  placeholder="관리자 비밀번호를 입력하세요"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="border-navy-200 focus:border-gold-500 focus:ring-gold-500"
                  required
                />
              </div>
              
              <div className="flex space-x-2">
                <Button type="submit" className="flex-1 bg-navy-800 hover:bg-navy-900">
                  인증
                </Button>
                <Button type="button" variant="outline" onClick={onBack} className="flex-1 border-navy-300 text-navy-700 hover:bg-navy-50">
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button onClick={onBack} variant="outline" className="mb-4 border-navy-300 text-navy-700 hover:bg-navy-100">
            ← 로그인 페이지로
          </Button>
          <h1 className="text-3xl mb-2 text-navy-900">관리자 페이지</h1>
          <p className="text-navy-600">학생 계정과 대학 데이터를 관리할 수 있습니다.</p>
        </div>

        <Tabs defaultValue="accounts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="accounts">학생 계정 관리</TabsTrigger>
            <TabsTrigger value="university-data">대학 데이터 관리</TabsTrigger>
            <TabsTrigger value="logic-debug">계산 로직 디버깅</TabsTrigger>
          </TabsList>

          {/* 학생 계정 관리 탭 */}
          <TabsContent value="accounts">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-navy-800">등록된 계정 목록</CardTitle>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gold-600 hover:bg-gold-700 text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        계정 추가
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="text-navy-800">새 계정 추가</DialogTitle>
                        <DialogDescription className="text-navy-600">
                          새로운 학생 계정을 추가합니다. 아이디, 이름, 비밀번호를 모두 입력해주세요.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddAccount} className="space-y-4">
                        {addError && (
                          <Alert variant="destructive">
                            <AlertDescription>{addError}</AlertDescription>
                          </Alert>
                        )}
                        
                        <div className="space-y-2">
                          <Label htmlFor="newId" className="text-navy-700">아이디</Label>
                          <Input
                            id="newId"
                            type="text"
                            placeholder="아이디를 입력하세요"
                            value={newAccount.id}
                            onChange={(e) => setNewAccount(prev => ({ ...prev, id: e.target.value }))}
                            className="border-navy-200 focus:border-gold-500 focus:ring-gold-500"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="newName" className="text-navy-700">이름</Label>
                          <Input
                            id="newName"
                            type="text"
                            placeholder="이름을 입력하세요"
                            value={newAccount.name}
                            onChange={(e) => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                            className="border-navy-200 focus:border-gold-500 focus:ring-gold-500"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="newPassword" className="text-navy-700">비밀번호</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            placeholder="비밀번호를 입력하세요"
                            value={newAccount.password}
                            onChange={(e) => setNewAccount(prev => ({ ...prev, password: e.target.value }))}
                            className="border-navy-200 focus:border-gold-500 focus:ring-gold-500"
                            required
                          />
                        </div>
                        
                        <div className="flex space-x-2 pt-4">
                          <Button type="submit" className="flex-1 bg-gold-600 hover:bg-gold-700">
                            계정 추가
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsAddDialogOpen(false)}
                            className="flex-1 border-navy-300 text-navy-700 hover:bg-navy-50"
                          >
                            취소
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>아이디</TableHead>
                        <TableHead>이름</TableHead>
                        <TableHead>비밀번호</TableHead>
                        <TableHead>성적 관리</TableHead>
                        <TableHead>보고서 인쇄</TableHead>
                        <TableHead>삭제</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.id}</TableCell>
                          <TableCell>{account.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono">
                                {showPasswords[account.id] ? account.password : '••••••••'}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => togglePasswordVisibility(account.id)}
                                className="h-6 w-6 p-0"
                              >
                                {showPasswords[account.id] ? 
                                  <EyeOff className="h-3 w-3" /> : 
                                  <Eye className="h-3 w-3" />
                                }
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openGradeDialog(account.id)}
                              className="border-gold-300 text-gold-700 hover:bg-gold-50"
                            >
                              <GraduationCap className="w-4 h-4 mr-1" />
                              성적 보기
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onViewPrintReport?.(account.id)}
                              className="border-navy-300 text-navy-700 hover:bg-navy-50"
                            >
                              <Printer className="w-4 h-4 mr-1" />
                              인쇄
                            </Button>
                          </TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>계정 삭제</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {account.name}({account.id}) 계정을 삭제하시겠습니까? 
                                    이 작업은 되돌릴 수 없으며, 해당 학생의 모든 성적 데이터도 함께 삭제됩니다.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>취소</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => onDeleteAccount(account.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    삭제
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {accounts.length === 0 && (
                  <div className="text-center py-8 text-navy-500">
                    등록된 계정이 없습니다. 새 계정을 추가해주세요.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 대학 데이터 관리 탭 (수시/정시 분리) */}
          <TabsContent value="university-data">
            <Tabs defaultValue="susi" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="susi">수시 데이터</TabsTrigger>
                <TabsTrigger value="jeongsi">정시 데이터</TabsTrigger>
              </TabsList>

              <TabsContent value="susi">
                {renderCSVFileSection('susi')}
              </TabsContent>

              <TabsContent value="jeongsi">
                {renderCSVFileSection('jeongsi')}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* 계산 로직 디버깅 탭 */}
          <TabsContent value="logic-debug">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-navy-800">계산 로직 디버깅</CardTitle>
                <p className="text-navy-600 text-sm">
                  대학 추천 시스템의 계산 로직을 테스트하고 모니터링할 수 있습니다.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 테스트 섹션 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-navy-800">로직 테스트</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button 
                        onClick={handleTestLogic}
                        className="bg-gold-600 hover:bg-gold-700"
                      >
                        <Database className="w-4 h-4 mr-2" />
                        계산 로직 테스트
                      </Button>
                      <Button 
                        onClick={handleCheckDatabase}
                        variant="outline"
                        className="border-navy-300 text-navy-700 hover:bg-navy-50"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        데이터베이스 상태 확인
                      </Button>
                    </div>
                  </div>

                  {/* 현재 로직 정보 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-navy-800">현재 적용된 로직</h3>
                    <div className="bg-navy-50 p-4 rounded-lg">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-navy-700">수시 계산 방식:</span>
                          <span className="text-navy-900">내신 등급 기반 + 학교 유형 가중치</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-navy-700">정시 계산 방식:</span>
                          <span className="text-navy-900">수능 등급 기반 + 과목별 가중치</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-navy-700">특목고 가중치:</span>
                          <span className="text-navy-900">1.2배</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-navy-700">자사고 가중치:</span>
                          <span className="text-navy-900">1.1배</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-navy-700">국제고 가중치:</span>
                          <span className="text-navy-900">1.15배</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 데이터베이스 상태 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-navy-800">데이터베이스 상태</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-navy-700">수시 데이터</span>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {susiFiles.length}개 파일
                          </Badge>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-navy-700">정시 데이터</span>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            {jeongsiFiles.length}개 파일
                          </Badge>
                        </div>
                      </Card>
                    </div>
                  </div>

                  {/* 테스트 결과 */}
                  {testResults && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-navy-800">테스트 결과</h3>
                      <div className="bg-navy-50 p-4 rounded-lg">
                        <pre className="text-sm text-navy-700 whitespace-pre-wrap">
                          {JSON.stringify(testResults, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 성적 관리 다이얼로그 */}
        <Dialog open={isGradeDialogOpen} onOpenChange={setIsGradeDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-navy-800">
                {accounts.find(acc => acc.id === selectedStudent)?.name} 성적 관리
              </DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="school" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="school">내신 성적</TabsTrigger>
                <TabsTrigger value="suneung">수능 성적</TabsTrigger>
              </TabsList>
              
              <TabsContent value="school" className="space-y-4">
                {renderSchoolGradeEditForm()}
              </TabsContent>
              
              <TabsContent value="suneung" className="space-y-4">
                {renderSuneungGradeEditForm()}
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsGradeDialogOpen(false)}
                className="border-navy-300 text-navy-700 hover:bg-navy-50"
              >
                취소
              </Button>
              <Button 
                onClick={saveGrades}
                className="bg-gold-600 hover:bg-gold-700"
              >
                저장
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
