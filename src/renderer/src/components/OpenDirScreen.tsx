interface Props {
  appLoading: boolean
  recentDirs: string[]
  onOpen: () => void
  onOpenRecent: (dirPath: string) => void
}

export function OpenDirScreen({ appLoading, recentDirs, onOpen, onOpenRecent }: Props) {
  return (
    <div className="open-dir-screen">
      <h1>Tables Editor</h1>
      {appLoading ? (
        <span className="spinner" aria-label="Loading" />
      ) : (
        <>
          {recentDirs.length > 0 && (
            <div className="recent-dirs">
              {recentDirs.map((dirPath) => (
                <button
                  key={dirPath}
                  className="recent-dir-btn"
                  title={dirPath}
                  onClick={() => onOpenRecent(dirPath)}
                >
                  {dirPath.split('/').pop() || dirPath}
                </button>
              ))}
            </div>
          )}
          <button className="open-dir-btn" onClick={onOpen}>
            Open ResultSet
          </button>
        </>
      )}
    </div>
  )
}
