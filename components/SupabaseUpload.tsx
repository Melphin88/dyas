import React, { useState } from 'react';
import { projectId, publicAnonKey, isDevelopmentMode } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Upload, Database } from 'lucide-react';

interface SupabaseUploadProps {
  onUploadSuccess: () => void;
}

interface UniversityData {
  university: string;
  department: string;
  admissionType: string;
  êµ? string;
  ?´ì‹ ?±ê¸‰: number;
  ?˜ëŠ¥?±ê¸‰: number;
  ?©ê²©ë¥? number;
}

export function SupabaseUpload({ onUploadSuccess }: SupabaseUploadProps) {
  const [csvContent, setCsvContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleCsvUpload = async () => {
    if (!csvContent.trim()) {
      setMessage('CSV ?´ìš©???…ë ¥?´ì£¼?¸ìš”');
      return;
    }

    // ê°œë°œ ëª¨ë“œ ì²´í¬
    if (isDevelopmentMode()) {
      setMessage('? ï¸ ê°œë°œ ëª¨ë“œ?ì„œ???…ë¡œ?œê? ì§€?ë˜ì§€ ?ŠìŠµ?ˆë‹¤. Supabase ?˜ê²½ë³€?˜ë? ?¤ì •?´ì£¼?¸ìš”.');
      return;
    }

    setLoading(true);
    try {
      const lines = csvContent.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      // ?ˆìƒ ?¤ë” ?•ì¸
      const expectedHeaders = ['university', 'department', 'admissionType', 'êµ?, '?´ì‹ ?±ê¸‰', '?˜ëŠ¥?±ê¸‰', '?©ê²©ë¥?];
      const hasValidHeaders = expectedHeaders.every(header => 
        headers.some(h => h.includes(header) || h.includes(header.replace('admissionType', '?„í˜•')) || h.includes('?€?™ëª…') || h.includes('?™ê³¼'))
      );

      if (!hasValidHeaders) {
        setMessage('CSV ?¤ë”ë¥??•ì¸?´ì£¼?¸ìš”. ?ˆì‹œ: university,department,admissionType,êµ??´ì‹ ?±ê¸‰,?˜ëŠ¥?±ê¸‰,?©ê²©ë¥?);
        setLoading(false);
        return;
      }

      const csvData: UniversityData[] = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        return {
          university: values[0] || '',
          department: values[1] || '',
          admissionType: values[2] || '',
          êµ? values[3] || '',
          ?´ì‹ ?±ê¸‰: parseFloat(values[4]) || 0,
          ?˜ëŠ¥?±ê¸‰: parseFloat(values[5]) || 0,
          ?©ê²©ë¥? parseFloat(values[6]) || 0
        };
      }).filter(data => data.university && data.department);

      if (csvData.length === 0) {
        setMessage('? íš¨???°ì´?°ê? ?†ìŠµ?ˆë‹¤.');
        setLoading(false);
        return;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/server/upload-csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ csvData })
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage(`??${csvData.length}ê°œì˜ ?€???°ì´?°ê? ?±ê³µ?ìœ¼ë¡??…ë¡œ?œë˜?ˆìŠµ?ˆë‹¤!`);
        setCsvContent('');
        onUploadSuccess();
      } else {
        setMessage(`???…ë¡œ???¤ë¥˜: ${result.error || 'CSV ?…ë¡œ?œì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤'}`);
      }
    } catch (error) {
      console.log('CSV ?…ë¡œ???¤ë¥˜:', error);
      setMessage('??CSV ?…ë¡œ??ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤');
    } finally {
      setLoading(false);
    }
  };

  const sampleCsv = `university,department,admissionType,êµ??´ì‹ ?±ê¸‰,?˜ëŠ¥?±ê¸‰,?©ê²©ë¥??œìš¸?€?™êµ,ì»´í“¨?°ê³µ?™ë?,?˜ì‹œ,,1.2,1.5,85
?°ì„¸?€?™êµ,ê²½ì˜?™ê³¼,?•ì‹œ,ê°€,1.8,2.1,75
ê³ ë ¤?€?™êµ,?˜ê³¼?€???•ì‹œ,??1.1,1.3,92
?±ê· ê´€?€?™êµ,ë²•í•™ê³??˜ì‹œ,,2.1,2.5,68`;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-navy-800">
          <Database className="w-5 h-5" />
          ?€???°ì´??CSV ?…ë¡œ??(Supabase)
        </CardTitle>
        <CardDescription className="text-navy-600">
          {isDevelopmentMode() ? 
            '? ï¸ ê°œë°œ ëª¨ë“œ?ì„œ???…ë¡œ?œê? ?œí•œ?©ë‹ˆ?? Supabase ?˜ê²½ë³€?˜ë? ?¤ì •?´ì£¼?¸ìš”.' :
            'CSV ?•ì‹???€???°ì´?°ë? Supabase ?œë²„???…ë¡œ?œí•©?ˆë‹¤. ëª¨ë“  ?¬ìš©?ê? ?™ì¼???°ì´?°ë? ?•ì¸?????ˆìŠµ?ˆë‹¤.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {message && (
          <Alert className={message.includes('??) ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <AlertDescription className={message.includes('??) ? 'text-green-700' : 'text-red-700'}>
              {message}
            </AlertDescription>
          </Alert>
        )}

        <div>
          <label className="block text-sm font-medium text-navy-700 mb-2">CSV ?•ì‹ ?ˆì‹œ</label>
          <pre className="bg-navy-50 p-3 rounded-md text-xs text-navy-700 overflow-x-auto">
            {sampleCsv}
          </pre>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy-700 mb-2">CSV ?°ì´???…ë ¥</label>
          <textarea
            className="w-full h-64 p-3 border border-navy-200 rounded-md focus:border-gold-500 focus:ring-1 focus:ring-gold-500 text-sm font-mono"
            placeholder="CSV ?°ì´?°ë? ?¬ê¸°??ë¶™ì—¬?£ê¸°?˜ì„¸??.."
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
          />
        </div>

        <div className="flex gap-4">
          <Button 
            onClick={handleCsvUpload}
            disabled={loading}
            className="flex-1 bg-gold-600 hover:bg-gold-700 text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            {loading ? '?…ë¡œ??ì¤?..' : 'Supabase???…ë¡œ??}
          </Button>
          <Button 
            onClick={() => setCsvContent(sampleCsv)}
            variant="outline"
            className="border-navy-300 text-navy-700 hover:bg-navy-50"
          >
            ?˜í”Œ ?°ì´??ë¡œë“œ
          </Button>
        </div>

        <div className="bg-gold-50 border border-gold-200 rounded-lg p-4">
          <h4 className="font-medium text-gold-900 mb-2">?“‹ CSV ?•ì‹ ê°€?´ë“œ</h4>
          <ul className="text-sm text-gold-800 space-y-1">
            <li>??<strong>?„ìˆ˜ ì»¬ëŸ¼:</strong> university, department, admissionType, êµ? ?´ì‹ ?±ê¸‰, ?˜ëŠ¥?±ê¸‰, ?©ê²©ë¥?/li>
            <li>??<strong>?˜ì‹œ:</strong> 'êµ? ì»¬ëŸ¼?€ ë¹„ì›Œ?ì„¸??/li>
            <li>??<strong>?•ì‹œ:</strong> 'êµ? ì»¬ëŸ¼??'ê°€', '??, '?? ì¤??˜ë‚˜ë¥??…ë ¥?˜ì„¸??/li>
            <li>??<strong>?±ê¸‰:</strong> 1.0~9.0 ?¬ì´???«ìë¡??…ë ¥?˜ì„¸??/li>
            <li>??<strong>?©ê²©ë¥?</strong> 0~100 ?¬ì´???«ìë¡??…ë ¥?˜ì„¸??/li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
