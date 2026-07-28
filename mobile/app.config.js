const baseConfig = require('./app.json');

module.exports = () => {
  const googleCloudApiKey = process.env.GOOGLE_CLOUD_API_KEY;

  if (!googleCloudApiKey || googleCloudApiKey === 'PASTE_YOUR_NEW_ARCORE_KEY_HERE') {
    throw new Error(
      'GOOGLE_CLOUD_API_KEY가 없습니다. Git에서 제외된 mobile/.env.local 또는 EAS 환경 변수에 설정하세요.',
    );
  }

  return {
    ...baseConfig.expo,
    plugins: baseConfig.expo.plugins.map((plugin) => {
      if (Array.isArray(plugin) && plugin[0] === '@reactvision/react-viro') {
        return [
          plugin[0],
          {
            ...plugin[1],
            googleCloudApiKey,
          },
        ];
      }
      return plugin;
    }),
  };
};
