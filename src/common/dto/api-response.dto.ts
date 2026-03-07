export interface ApiResponseDto<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponseDto {
  success: false;
  error: {
    statusCode: number;
    message: string | string[];
    path: string;
    timestamp: string;
  };
}
