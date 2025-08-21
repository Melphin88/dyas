            {loading ? (
              <div className="text-center py-8 text-navy-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-600 mx-auto mb-2"></div>
                파일 목록을 불러오는 중...
                <div className="text-sm text-navy-400 mt-2">
                  잠시만 기다려주세요
                </div>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8 text-navy-500">
                업로드된 {typeLabel} 파일이 없습니다. CSV 파일을 업로드해주세요.
              </div>
            ) : (