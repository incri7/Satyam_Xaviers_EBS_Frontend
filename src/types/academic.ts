export interface Class {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: number;
  name: string;
  class_id: number;
  capacity: number;
  class_teacher_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: number;
  student_id: number;
  class_id: number;
  section_id: number | null;
  academic_year: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  class_?: Class;
  section?: Section;
}

export interface ClassCreate {
  name: string;
}

export interface ClassUpdate {
  name: string;
}

export interface SectionCreate {
  name: string;
  class_id: number;
  capacity: number;
  class_teacher_id?: number;
}

export interface SectionUpdate {
  name?: string;
  class_id?: number;
  capacity?: number;
  class_teacher_id?: number;
}

export interface EnrollmentCreate {
  student_id: number;
  class_id: number;
  section_id?: number;
  academic_year: string;
  is_active?: boolean;
}

export interface EnrollmentUpdate {
  student_id?: number;
  class_id?: number;
  section_id?: number;
  academic_year?: string;
  is_active?: boolean;
}

export interface EnrollmentBulkCreate {
  enrollments: EnrollmentCreate[];
}

// Response Types
export interface ClassListResponse {
  message: string;
  classes: Class[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface SectionListResponse {
  message: string;
  sections: Section[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface EnrollmentListResponse {
  message: string;
  enrollments: Enrollment[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
}
