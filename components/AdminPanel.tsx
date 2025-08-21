                {/* 파일 선택 버튼 */}
                <Button 
                  onClick={() => handleFileSelect(type)}
                  disabled={uploading}
                  className={`${uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gold-600 hover:bg-gold-700'}`}
                >
                  {uploading ? `${typeLabel} 업로드 중...` : `${typeLabel} 파일 선택`}
                </Button>