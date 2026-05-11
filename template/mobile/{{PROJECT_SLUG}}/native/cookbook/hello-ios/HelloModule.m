// Objective-C bridge for HelloModule.swift.
//
// React Native's native-module macros (RCT_EXTERN_MODULE,
// RCT_EXTERN_METHOD) are Objective-C. They generate the runtime
// glue that exposes Swift methods to JS. Every Swift module needs a
// matching .m file; the .m doesn't contain logic, just declarations.
//
// Notes:
//   - The first arg of RCT_EXTERN_METHOD is the SELECTOR — keep the
//     name + parameter labels exactly matching the Swift signature.
//   - For Promise-based methods, the last two params are
//     (RCTPromiseResolveBlock)resolve / (RCTPromiseRejectBlock)reject.
//   - `RCT_EXPORT_METHOD` (without _EXTERN) is for inline ObjC; we use
//     the EXTERN family because the implementation is in Swift.
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(Hello, NSObject)

RCT_EXTERN_METHOD(greet:(NSString *)name)

RCT_EXTERN_METHOD(echoAsync:(NSString *)value
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
