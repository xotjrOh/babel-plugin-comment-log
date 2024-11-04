module.exports = function ({ types: t }) {
    return {
      visitor: {
        Program(path, state) {
          // 개발 환경에서만 동작
          if (process.env.NODE_ENV === 'production') return;
  
          const { node } = path;
  
          // 이하 플러그인 로직...
          // 주석 파싱, useEffect 훅 생성 및 삽입 등
        },
      },
    };
  };
  