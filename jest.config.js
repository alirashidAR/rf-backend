export default {
    testEnvironment: "node",
    setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
    moduleDirectories: ["node_modules", "src"],
    clearMocks: true,
    transform: {
      "^.+\\.js$": "babel-jest", // Ensures Babel is used to transform ES Modules
    },
  };
  