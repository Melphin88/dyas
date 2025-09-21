import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

export interface University {
  name: string;
  department: string;
  admissionType: '수시' | '정시';
  competitionRate: number;
  requiredGrade: number;
  matchPercentage: number;
  location: string;
  description: string;
}

interface UniversityCardProps {
  university: University;
}

export function UniversityCard({ university }: UniversityCardProps) {
  const getMatchColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-100 text-green-800';
    if (percentage >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getMatchText = (percentage: number) => {
    if (percentage >= 80) return '안전';
    if (percentage >= 60) return '적정';
    return '소신';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{university.name}</CardTitle>
            <p className="text-gray-600 mt-1">{university.department}</p>
            <p className="text-sm text-gray-500">{university.location}</p>
          </div>
          <Badge className={getMatchColor(university.matchPercentage)}>
            {getMatchText(university.matchPercentage)} ({university.matchPercentage}%)
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">전형 구분:</span>
            <Badge variant="outline">{university.admissionType}</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">경쟁률:</span>
            <span>{university.competitionRate}:1</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">요구 성적:</span>
            <span>{university.requiredGrade}등급</span>
          </div>
          <p className="text-sm text-gray-700 mt-3">{university.description}</p>
        </div>
      </CardContent>
    </Card>
  );
}