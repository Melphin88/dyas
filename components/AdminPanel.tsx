  // CSV 파일 목록 로드 (개발 모드에서는 호출하지 않음)
  const loadCSVFiles = async (type: 'susi' | 'jeongsi') => {
    if (isDevelopmentMode()) {
      console.log(`개발 모드: ${type} 파일 로드를 건너뜁니다.`);
      return;
    }

    try {
      setIsLoading(prev => ({...prev, [type]: true}));
      console.log(`Loading ${type} files...`);
      
      // 타임아웃 설정 (10초)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/server/csv-files/${type}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
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
      
      // 타임아웃 오류인지 확인
      if (error.name === 'AbortError') {
        setUploadError(prev => ({...prev, [type]: `요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.`}));
      } else {
        setUploadError(prev => ({...prev, [type]: `파일 목록 로드 실패: ${error.message}`}));
      }
      
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