"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "_api_utils_audit_ts";
exports.ids = ["_api_utils_audit_ts"];
exports.modules = {

/***/ "(api)/./utils/audit.ts":
/*!************************!*\
  !*** ./utils/audit.ts ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   logDeletion: () => (/* binding */ logDeletion)\n/* harmony export */ });\n/* harmony import */ var _firebase_admin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../firebase/admin */ \"(api)/./firebase/admin.ts\");\n// utils/audit.ts\n// Simple audit logging helper for admin actions.\n// Stores entries in Firestore collection \"auditLogs\".\n// Each entry includes: action, adminId, reportId, timestamp, details.\n\nasync function logDeletion(adminId, reportId) {\n    const entry = {\n        action: \"deleteReport\",\n        adminId,\n        reportId,\n        timestamp: new Date().toISOString(),\n        details: `Report ${reportId} deleted by admin ${adminId}`\n    };\n    await _firebase_admin__WEBPACK_IMPORTED_MODULE_0__.adminFirestore.collection(\"auditLogs\").add(entry);\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwaSkvLi91dGlscy9hdWRpdC50cyIsIm1hcHBpbmdzIjoiOzs7OztBQUFBLGlCQUFpQjtBQUNqQixpREFBaUQ7QUFDakQsc0RBQXNEO0FBQ3RELHNFQUFzRTtBQUVuQjtBQUU1QyxlQUFlQyxZQUFZQyxPQUFlLEVBQUVDLFFBQWdCO0lBQ2pFLE1BQU1DLFFBQVE7UUFDWkMsUUFBUTtRQUNSSDtRQUNBQztRQUNBRyxXQUFXLElBQUlDLE9BQU9DLFdBQVc7UUFDakNDLFNBQVMsQ0FBQyxPQUFPLEVBQUVOLFNBQVMsa0JBQWtCLEVBQUVELFFBQVEsQ0FBQztJQUMzRDtJQUNBLE1BQU1GLDJEQUFjQSxDQUFDVSxVQUFVLENBQUMsYUFBYUMsR0FBRyxDQUFDUDtBQUNuRCIsInNvdXJjZXMiOlsid2VicGFjazovL3BlbmdhZHVhbi1zY2FtbWVyLy4vdXRpbHMvYXVkaXQudHM/NDNlYiJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyB1dGlscy9hdWRpdC50c1xyXG4vLyBTaW1wbGUgYXVkaXQgbG9nZ2luZyBoZWxwZXIgZm9yIGFkbWluIGFjdGlvbnMuXHJcbi8vIFN0b3JlcyBlbnRyaWVzIGluIEZpcmVzdG9yZSBjb2xsZWN0aW9uIFwiYXVkaXRMb2dzXCIuXHJcbi8vIEVhY2ggZW50cnkgaW5jbHVkZXM6IGFjdGlvbiwgYWRtaW5JZCwgcmVwb3J0SWQsIHRpbWVzdGFtcCwgZGV0YWlscy5cclxuXHJcbmltcG9ydCB7IGFkbWluRmlyZXN0b3JlIH0gZnJvbSBcIi4uL2ZpcmViYXNlL2FkbWluXCI7XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9nRGVsZXRpb24oYWRtaW5JZDogc3RyaW5nLCByZXBvcnRJZDogc3RyaW5nKSB7XHJcbiAgY29uc3QgZW50cnkgPSB7XHJcbiAgICBhY3Rpb246IFwiZGVsZXRlUmVwb3J0XCIsXHJcbiAgICBhZG1pbklkLFxyXG4gICAgcmVwb3J0SWQsXHJcbiAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgIGRldGFpbHM6IGBSZXBvcnQgJHtyZXBvcnRJZH0gZGVsZXRlZCBieSBhZG1pbiAke2FkbWluSWR9YCxcclxuICB9O1xyXG4gIGF3YWl0IGFkbWluRmlyZXN0b3JlLmNvbGxlY3Rpb24oXCJhdWRpdExvZ3NcIikuYWRkKGVudHJ5KTtcclxufVxyXG4iXSwibmFtZXMiOlsiYWRtaW5GaXJlc3RvcmUiLCJsb2dEZWxldGlvbiIsImFkbWluSWQiLCJyZXBvcnRJZCIsImVudHJ5IiwiYWN0aW9uIiwidGltZXN0YW1wIiwiRGF0ZSIsInRvSVNPU3RyaW5nIiwiZGV0YWlscyIsImNvbGxlY3Rpb24iLCJhZGQiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(api)/./utils/audit.ts\n");

/***/ })

};
;