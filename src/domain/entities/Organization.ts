/** organizations.json に保存される完全な組織エンティティ */
export type Organization = {
  id: string;
  name: string;
};

/** ninjas.json の organizations に保存される組織参照（IDのみ） */
export type OrganizationRef = {
  id: string;
};
