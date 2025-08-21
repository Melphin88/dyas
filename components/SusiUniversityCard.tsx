import React from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Eye } from 'lucide-react';
import { RecommendedSusiUniversity } from '../types/university';
import { getGradeColor, getProbabilityText } from '../utils/universityCalculations';

interface SusiUniversityCardProps {
  university: RecommendedSusiUniversity;
}

export function SusiUniversityCard({ university }: SusiUniversityCardProps) {
  return (
    <div className="p-6 rounded-lg border border-navy-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h4 className="font-medium text-navy-900 mb-1 text-lg">{university.university}</h4>
          <p className="text-sm text-navy-600 mb-1">{university.department}</p>
          <div className="flex items-center space-x-2">
            <span className="text-xs px-2 py-1 bg-navy-100 text-navy-700 rounded">{university.region}</span>
            <span className="text-xs px-2 py-1 bg-navy-100 text-navy-700 rounded">{university.category}</span>
            <span className="text-xs px-2 py-1 bg-navy-100 text-navy-700 rounded">{university.highschool_type}</span>
          </div>
        </div>
        <div className={`px-3 py-2 rounded-full text-sm font-medium ml-4 ${getGradeColor(university.합격가능성등급)}`}>
          {getProbabilityText(university.합격가능성등급)} {university.예상합격률}%
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-navy-600">전형:</span>
            <span className="text-navy-800 font-medium">{university.admission_type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-navy-600">연도:</span>
            <span className="text-navy-800">{university.year}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-navy-600">등급 50%:</span>
            <span className="text-navy-800 font-medium">
              {university.grade_50_cut > 0 ? `${university.grade_50_cut}등급` : '-'}
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-navy-600">모집인원:</span>
            <span className="text-navy-800 font-medium">{university.recruitment_count}명</span>
          </div>
          <div className="flex justify-between">
            <span className="text-navy-600">경쟁률:</span>
            <span className="text-navy-800 font-medium">{university.competition_rate}:1</span>
          </div>
          <div className="flex justify-between">
            <span className="text-navy-600">등급 70%:</span>
            <span className="text-navy-800 font-medium">
              {university.grade_70_cut > 0 ? `${university.grade_70_cut}등급` : '-'}
            </span>
          </div>
        </div>
      </div>
      
      {university.real_competition_rate > 0 && (
        <div className="mb-4 pt-3 border-t border-navy-100">
          <div className="flex justify-between text-sm">
            <span className="text-navy-600">실경쟁률:</span>
            <span className="text-navy-800 font-medium">{university.real_competition_rate}:1</span>
          </div>
        </div>
      )}

      {/* 최근 3년 데이터 */}
      {university.과거데이터.length > 0 && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Eye className="w-4 h-4 mr-1" />
              최근 3년 데이터 보기
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{university.university} {university.department} - 최근 3년 데이터</DialogTitle>
            </DialogHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>연도</TableHead>
                    <TableHead>전형</TableHead>
                    <TableHead>등급 50%</TableHead>
                    <TableHead>등급 70%</TableHead>
                    <TableHead>모집인원</TableHead>
                    <TableHead>경쟁률</TableHead>
                    <TableHead>실경쟁률</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {university.과거데이터.map((data, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{data.year}</TableCell>
                      <TableCell>{data.admission_type}</TableCell>
                      <TableCell>{data.grade_50_cut > 0 ? `${data.grade_50_cut}등급` : '-'}</TableCell>
                      <TableCell>{data.grade_70_cut > 0 ? `${data.grade_70_cut}등급` : '-'}</TableCell>
                      <TableCell>{data.recruitment_count}명</TableCell>
                      <TableCell>{data.competition_rate}:1</TableCell>
                      <TableCell>{data.real_competition_rate}:1</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}