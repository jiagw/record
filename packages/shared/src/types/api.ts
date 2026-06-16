export interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

export interface AuthResult {
  token: string
  userId: string
}
