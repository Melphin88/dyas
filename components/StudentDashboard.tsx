// DEPRECATED: 이 컴포넌트는 더 이상 사용되지 않습니다.
// App.tsx에서 직접 관리됩니다.

import React from 'react';
import { Alert, AlertDescription } from './ui/alert';

interface StudentDashboardProps {
  studentId?: string;
  studentName?: string;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ studentId, studentName }) => {
  return (
    <div className="p-6">
      <Alert>
        <AlertDescription>
          이 컴포넌트는 더 이상 사용되지 않습니다. 메인 App.tsx에서 직접 관리됩니다.
          {studentId && ` (Student ID: ${studentId})`}
          {studentName && ` (Student Name: ${studentName})`}
        </AlertDescription>
      </Alert>
    </div>
  );
};

export { StudentDashboard };
export default StudentDashboard;