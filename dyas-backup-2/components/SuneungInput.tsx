import React, { useState, useEffect } from 'react';

interface SuneungData {
  korean: number;
  math: number;
  english: number;
  inquiry1: number;
  inquiry2: number;
  korean_standard?: number;
  math_standard?: number;
  english_standard?: number;
  inquiry1_standard?: number;
  inquiry2_standard?: number;
  total_score?: number;
}

interface SuneungInputProps {
  initialData?: SuneungData | null;
  onSave: (data: SuneungData) => void;
  onBack?: () => void;
  onViewResults?: () => void;
}

export function SuneungInput({ initialData, onSave, onBack, onViewResults }: SuneungInputProps) {
  const [suneungData, setSuneungData] = useState<SuneungData>({
    korean: 0,
    math: 0,
    english: 0,
    inquiry1: 0,
    inquiry2: 0,
    korean_standard: 0,
    math_standard: 0,
    english_standard: 0,
    inquiry1_standard: 0,
    inquiry2_standard: 0,
    total_score: 0
  });
  const [inputType, setInputType] = useState<'raw' | 'standard'>('raw');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (initialData) {
      setSuneungData(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    // 총점 계산
    if (inputType === 'raw') {
      const total = suneungData.korean + suneungData.math + suneungData.english + 
                   suneungData.inquiry1 + suneungData.inquiry2;
      setSuneungData(prev => ({ ...prev, total_score: total }));
    } else {
      const total = (suneungData.korean_standard || 0) + (suneungData.math_standard || 0) + 
                   (suneungData.english_standard || 0) + (suneungData.inquiry1_standard || 0) + 
                   (suneungData.inquiry2_standard || 0);
      setSuneungData(prev => ({ ...prev, total_score: total }));
    }
  }, [suneungData.korean, suneungData.math, suneungData.english, suneungData.inquiry1, suneungData.inquiry2,
      suneungData.korean_standard, suneungData.math_standard, suneungData.english_standard, 
      suneungData.inquiry1_standard, suneungData.inquiry2_standard, inputType]);

  const handleScoreChange = (field: keyof SuneungData, value: string) => {
    const score = parseFloat(value) || 0;
    setSuneungData(prev => ({
      ...prev,
      [field]: score
    }));
  };

  const handleSave = () => {
    onSave(suneungData);
    setMessage('수능 성적이 저장되었습니다.');
    setTimeout(() => setMessage(''), 3000);
  };

  const subjects = [
    { key: 'korean', standardKey: 'korean_standard', name: '국어', max: inputType === 'raw' ? 9 : 200 },
    { key: 'math', standardKey: 'math_standard', name: '수학', max: inputType === 'raw' ? 9 : 200 },
    { key: 'english', standardKey: 'english_standard', name: '영어', max: inputType === 'raw' ? 9 : 200 },
    { key: 'inquiry1', standardKey: 'inquiry1_standard', name: '탐구 1', max: inputType === 'raw' ? 9 : 100 },
    { key: 'inquiry2', standardKey: 'inquiry2_standard', name: '탐구 2', max: inputType === 'raw' ? 9 : 100 }
  ];

  return (
    <div className="min-h-screen bg-navy-50 p-4">
      <div className="max-w-4xl mx-auto">
        {onBack && (
          <button
            onClick={onBack}
            className="mb-4 px-4 py-2 border border-navy-300 text-navy-700 hover:bg-navy-100 rounded-md"
          >
            ← 이전으로
          </button>
        )}
        
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-navy-900 mb-6">
            수능 성적 입력
          </h3>

          {message && (
            <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-md">
              {message}
            </div>
          )}

          {/* 입력 방식 선택 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-navy-700 mb-3">
              점수 입력 방식
            </label>
            <div className="flex space-x-4">
              <button
                onClick={() => setInputType('raw')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  inputType === 'raw'
                    ? 'bg-navy-600 text-white'
                    : 'bg-navy-200 text-navy-700 hover:bg-navy-300'
                }`}
              >
                등급 입력
              </button>
              <button
                onClick={() => setInputType('standard')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  inputType === 'standard'
                    ? 'bg-navy-600 text-white'
                    : 'bg-navy-200 text-navy-700 hover:bg-navy-300'
                }`}
              >
                표준점수 입력
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {subjects.map(subject => (
              <div key={subject.key} className="flex items-center space-x-4">
                <label className="block text-sm font-medium text-navy-700 min-w-[80px]">
                  {subject.name}
                </label>
                <div className="flex-1">
                  <input
                    type="number"
                    min={inputType === 'raw' ? '1' : '0'}
                    max={inputType === 'raw' ? '9' : subject.max}
                    step={inputType === 'raw' ? '1' : '0.01'}
                    value={inputType === 'raw' 
                      ? suneungData[subject.key as keyof SuneungData] || ''
                      : suneungData[subject.standardKey as keyof SuneungData] || ''
                    }
                    onChange={(e) => handleScoreChange(
                      (inputType === 'raw' ? subject.key : subject.standardKey) as keyof SuneungData, 
                      e.target.value
                    )}
                    className="w-full px-3 py-2 border border-navy-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder={inputType === 'raw' ? '1-9등급' : `0-${subject.max}`}
                  />
                </div>
                <span className="text-sm text-navy-500 min-w-[60px]">
                  {inputType === 'raw' ? '등급' : `/ ${subject.max}점`}
                </span>
              </div>
            ))}

            {/* 평균 표시 */}
            <div className="bg-gold-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gold-900">
                  {inputType === 'raw' ? '평균 등급' : '평균 표준점수'}
                </span>
                <span className="text-2xl font-bold text-gold-600">
                  {inputType === 'raw' 
                    ? (suneungData.total_score! / 5).toFixed(2) + '등급'
                    : suneungData.total_score?.toFixed(2) + '점'
                  }
                </span>
              </div>
              <p className="text-sm text-gold-700 mt-1">
                {inputType === 'raw' ? '5개 과목 평균 등급' : '5개 과목 총 표준점수'}입니다.
              </p>
            </div>

            <div className="flex justify-between space-x-4 pt-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="bg-navy-200 text-navy-700 px-6 py-2 rounded-md hover:bg-navy-300 focus:outline-none focus:ring-2 focus:ring-navy-500"
                >
                  이전으로
                </button>
              )}
              <div className="flex space-x-4">
                <button
                  onClick={handleSave}
                  className="bg-gold-600 text-white px-6 py-2 rounded-md hover:bg-gold-700 focus:outline-none focus:ring-2 focus:ring-gold-500"
                >
                  저장
                </button>
                {onViewResults && (
                  <button
                    onClick={() => {
                      handleSave();
                      onViewResults();
                    }}
                    className="bg-navy-600 text-white px-6 py-2 rounded-md hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-500"
                  >
                    분석결과보기
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-navy-50 rounded-lg">
            <h5 className="font-medium text-navy-900 mb-2">입력 가이드</h5>
            <ul className="text-sm text-navy-600 space-y-1">
              <li>• 등급 입력: 국어, 수학, 영어, 탐구 각 과목의 등급(1~9등급)</li>
              <li>• 표준점수: 국어, 수학, 영어(200점), 탐구 각 과목(100점)</li>
              <li>• 탐구 영역은 2과목을 선택하여 입력해주세요.</li>
              <li>• 수능 성적표를 참고하여 정확히 입력해주세요.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}