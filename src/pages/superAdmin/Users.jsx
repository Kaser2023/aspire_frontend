import { useState, useEffect, useCallback, useRef } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'
import { usersService, branchesService, programsService } from '../../services'
import playersService from '../../services/players.service'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const FILE_BASE_URL = API_URL.replace(/\/api\/?$/, '')

// Map frontend tab to backend role
const TAB_TO_ROLE = {
  superadmins: 'super_admin',
  supervisors: 'branch_admin',
  coaches: 'coach',
  accountants: 'accountant',
  accounts: 'parent'
}

export default function Users() {
  const { language } = useLanguage()
  const { user: currentUser } = useAuth()
  
  // Check if current user is owner
  const isOwner = currentUser?.role === 'owner'
  
  // State
  const [activeTab, setActiveTab] = useState('supervisors')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [expandedUserId, setExpandedUserId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [deleteType, setDeleteType] = useState('soft')
  const [filterBranch, setFilterBranch] = useState('all')
  const [assignmentFilter, setAssignmentFilter] = useState('all')
  const [showPassword, setShowPassword] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [parentSearchQuery, setParentSearchQuery] = useState('')
  const [childrenSearchQuery, setChildrenSearchQuery] = useState('')
  
  // Data state
  const [users, setUsers] = useState([])
  const [allPlayers, setAllPlayers] = useState([]) // Store all players for parent selection
  const [branches, setBranches] = useState([])
  const [programs, setPrograms] = useState([])
  const [parents, setParents] = useState([]) // For player creation
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [userCounts, setUserCounts] = useState({
    superadmins: 0,
    supervisors: 0,
    coaches: 0,
    players: 0,
    accountants: 0,
    accounts: 0
  })

  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    branch: '',
    branchId: '', // For player creation
    program: '',
    programs: [], // For coach creation - multiple programs
    programId: '', // For player creation
    coachId: '', // For player creation - selected coach
    children: [], // For parent creation - connected children
    birthDate: '',
    parentId: '', // For player creation
    parentName: '',
    parentNameAr: '',
    parentPhone: '',
    coach: '',
    gender: 'male',
    idType: 'national_id',
    idDocument: null,
    idDocumentPreview: null,
    healthNotes: '',
    nationality: '',
    address: '',
    permissions: [],
    avatar: null,
    avatarPreview: null
  })

  const avatarInputRef = useRef(null)
  const playerAvatarInputRef = useRef(null)
  const playerIdDocInputRef = useRef(null)

  // Available permissions for Super Admins
  const availablePermissions = [
    { id: 'users_branch_admins', label: { en: 'Manage Branch Admins', ar: 'إدارة مدراء الفروع' }, icon: '👔' },
    { id: 'users_coaches', label: { en: 'Manage Coaches', ar: 'إدارة المدربين' }, icon: '🏃' },
    { id: 'users_players', label: { en: 'Manage Players', ar: 'إدارة اللاعبين' }, icon: '⚽' },
    { id: 'users_accountants', label: { en: 'Manage Accountants', ar: 'إدارة المحاسبين' }, icon: '💼' },
    { id: 'branches', label: { en: 'Manage Branches', ar: 'إدارة الفروع' }, icon: '🏢' },
    { id: 'programs', label: { en: 'Manage Programs', ar: 'إدارة البرامج' }, icon: '📋' },
    { id: 'financial', label: { en: 'View Financial Reports', ar: 'عرض التقارير المالية' }, icon: '💰' },
    { id: 'settings', label: { en: 'System Settings', ar: 'إعدادات النظام' }, icon: '⚙️' },
  ]

  // Tabs - Super Admins tab only visible to Owner
  const tabs = [
    ...(isOwner ? [{ id: 'superadmins', label: { en: 'Super Admins', ar: 'المدراء العامون' }, count: userCounts.superadmins, ownerOnly: true }] : []),
    { id: 'supervisors', label: { en: 'Branch Admins', ar: 'مدراء الفروع' }, count: userCounts.supervisors },
    { id: 'coaches', label: { en: 'Coaches', ar: 'المدربون' }, count: userCounts.coaches },
    { id: 'players', label: { en: 'Players', ar: 'اللاعبون' }, count: userCounts.players },
    { id: 'accountants', label: { en: 'Accountants', ar: 'المحاسبون' }, count: userCounts.accountants },
    { id: 'accounts', label: { en: 'Registered Accounts', ar: 'الحسابات المسجلة' }, count: userCounts.accounts },
  ]

  // Transform API user to UI format
  const transformUserFromAPI = useCallback((apiUser, role) => {
    const fullName = `${apiUser.first_name || ''} ${apiUser.last_name || ''}`.trim()
    const base = {
      id: apiUser.id,
      name: { 
        en: fullName || apiUser.email, 
        ar: apiUser.name_ar || fullName || apiUser.email 
      },
      phone: apiUser.phone || '',
      email: apiUser.email || '',
      status: apiUser.is_active ? 'active' : 'inactive',
      lastActive: apiUser.last_login ? new Date(apiUser.last_login).toLocaleDateString() : 'Never',
      createdAt: apiUser.created_at ? new Date(apiUser.created_at).toLocaleDateString() : '',
      permissions: apiUser.permissions || [],
      branchId: apiUser.branch_id,
      branch: apiUser.branch?.name || '',
      branchAr: apiUser.branch?.name_ar || apiUser.branch?.name || '',
      avatar: apiUser.avatar || null,
    }

    // Add role-specific fields
    if (role === 'coach') {
      // Programs is an array from the API
      const programsArray = apiUser.programs || []
      // Create a display string from all programs
      const programNames = programsArray.map(p => p.name).join(', ')
      const programNamesAr = programsArray.map(p => p.name_ar || p.name).join('، ')
      
      base.program = { en: programNames || '-', ar: programNamesAr || '-' }
      base.programId = programsArray.length > 0 ? programsArray[0].id : null
      base.players = apiUser.player_count || 0
      base.programs = programsArray
    }

    return base
  }, [])

  // Fetch branches, programs, and parents
  const fetchBranchesAndPrograms = useCallback(async () => {
    try {
      const [branchesRes, programsRes, parentsRes] = await Promise.all([
        branchesService.getAll(),
        programsService.getAll(),
        usersService.getByRole('parent', { limit: 100 })
      ])
      
      if (branchesRes.success && branchesRes.data) {
        const transformedBranches = branchesRes.data.map(b => ({
          id: b.id,
          name: { en: b.name, ar: b.name_ar || b.name }
        }))
        setBranches(transformedBranches)
      }
      
      if (programsRes.success && programsRes.data) {
        const transformedPrograms = programsRes.data.map(p => ({
          id: p.id,
          name: { en: p.name, ar: p.name_ar || p.name },
          type: p.type,
          age_group_min: p.age_group_min,
          age_group_max: p.age_group_max,
          ageRange: p.age_range || `${p.age_group_min || 0}-${p.age_group_max || 18}`,
          branch_id: p.branch_id,
          coaches: p.coaches || [] // Use coaches array instead of single coach
        }))
        setPrograms(transformedPrograms)
      }

      if (parentsRes.success && parentsRes.data) {
        const transformedParents = parentsRes.data.map(p => ({
          id: p.id,
          name: { 
            en: `${p.first_name || ''} ${p.last_name || ''}`.trim(), 
            ar: p.name_ar || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.phone 
          },
          phone: p.phone
        }))
        setParents(transformedParents)
      } else {
        // Handle case where no parents found
      }
    } catch (err) {
      console.error('Error fetching branches/programs/parents:', err)
    }
  }, [])

  // Fetch users based on active tab
  const fetchUsers = useCallback(async () => {
    if (activeTab === 'players') {
      // Fetch players from players service
      setLoading(true)
      try {
        const params = { limit: 100 }
        if (filterBranch !== 'all') {
          const branch = branches.find(b => b.name.en === filterBranch)
          if (branch) params.branch_id = branch.id
        }
        if (searchQuery) {
          params.search = searchQuery
        }
        
        if (assignmentFilter !== 'all') {
          params.assignment_status = assignmentFilter
        }

        const response = await playersService.getAll(params)
        if (response.success) {
          const transformed = response.data.map(p => ({
            id: p.id,
            // Keep original fields for editing
            first_name: p.first_name,
            last_name: p.last_name,
            first_name_ar: p.first_name_ar,
            last_name_ar: p.last_name_ar,
            date_of_birth: p.date_of_birth,
            gender: p.gender,
            status: p.status || 'active',
            coach: p.coach || null,
            avatar: p.avatar || null,
            idDocument: p.id_document || null,
            healthNotes: p.medical_notes || '',
            nationality: p.nationality || '',
            address: p.address || '',
            // Also keep transformed fields for display
            name: { 
              en: `${p.first_name || ''} ${p.last_name || ''}`.trim(), 
              ar: `${p.first_name_ar || p.first_name || ''} ${p.last_name_ar || p.last_name || ''}`.trim()
            },
            phone: p.parent?.phone || '',
            selfUserPhone: p.selfUser?.phone || null,
            parentName: p.parent ? `${p.parent.first_name || ''} ${p.parent.last_name || ''}`.trim() : '',
            branch: p.branch?.name || '',
            branchAr: p.branch?.name_ar || p.branch?.name || '',
            branchId: p.branch?.id || '',
            program: p.program ? { en: p.program.name, ar: p.program.name_ar || p.program.name } : null,
            programId: p.program?.id || '',
            birthDate: p.date_of_birth,
            parentId: p.parent?.id || '',
            parent: p.parent || null
          }))
          setUsers(transformed)
          setUserCounts(prev => ({ ...prev, players: response.pagination?.total || transformed.length }))
        }
      } catch (err) {
        console.error('Error fetching players:', err)
        setUsers([])
      } finally {
        setLoading(false)
      }
      return
    }

    if (activeTab === 'accounts') {
      // Fetch parents from API
      console.log('🔍 Fetching parents from API...')
      setLoading(true)
      try {
        const response = await usersService.getByRole('parent', { limit: 100 })
        console.log('📥 Parents API response:', response)
        if (response.success) {
          const transformed = response.data.map(u => ({
            id: u.id,
            name: { en: `${u.first_name || ''} ${u.last_name || ''}`.trim(), ar: u.name_ar || `${u.first_name || ''} ${u.last_name || ''}`.trim() },
            phone: u.phone || '',
            registered: u.created_at ? new Date(u.created_at).toLocaleDateString() : '',
            children: u.children || [], // Store actual children data for editing
            children_count: u.children?.length || 0, // Count for display
            status: u.children?.length > 0 ? 'enrolled' : 'pending',
            avatar: u.avatar || null
          }))
          console.log('✅ Transformed parents data:', transformed)
          setUsers(transformed)
          setUserCounts(prev => ({ ...prev, accounts: response.pagination?.total || transformed.length }))
        }
      } catch (err) {
        console.error('❌ Error fetching parents:', err)
        setUsers([])
      } finally {
        setLoading(false)
      }
      return
    }

    // Fetch real users from API
    setLoading(true)
    setError(null)
    
    try {
      const role = TAB_TO_ROLE[activeTab]
      if (!role) return

      const params = { limit: 100 }
      if (filterBranch !== 'all') {
        const branch = branches.find(b => b.name.en === filterBranch)
        if (branch) params.branch_id = branch.id
      }
      if (searchQuery) {
        params.search = searchQuery
      }

      const response = await usersService.getByRole(role, params)
      
      if (response.success) {
        const transformed = response.data.map(u => transformUserFromAPI(u, role))
        setUsers(transformed)
        setUserCounts(prev => ({
          ...prev,
          [activeTab]: response.pagination?.total || transformed.length
        }))
      }
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(language === 'ar' ? 'فشل في تحميل المستخدمين' : 'Failed to load users')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [activeTab, filterBranch, assignmentFilter, searchQuery, branches, language, transformUserFromAPI])

  // Fetch all user counts
  const fetchUserCounts = useCallback(async () => {
    try {
      const roles = ['super_admin', 'branch_admin', 'coach', 'accountant', 'parent']
      const promises = roles.map(role => usersService.getByRole(role, { limit: 1 }))
      const [userResponses, playersResponse] = await Promise.all([
        Promise.all(promises),
        playersService.getAll({ limit: 1 })
      ])
      
      setUserCounts({
        superadmins: userResponses[0]?.pagination?.total || 0,
        supervisors: userResponses[1]?.pagination?.total || 0,
        coaches: userResponses[2]?.pagination?.total || 0,
        players: playersResponse?.pagination?.total || 0,
        accountants: userResponses[3]?.pagination?.total || 0,
        accounts: userResponses[4]?.pagination?.total || 0
      })
    } catch (err) {
      console.error('Error fetching counts:', err)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchBranchesAndPrograms()
    fetchUserCounts()
  }, [fetchBranchesAndPrograms, fetchUserCounts])

  // Fetch users when tab or filters change
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Add debug to track formData changes (temporarily disabled)
  // useEffect(() => {
  //   console.log('formData.children changed:', formData.children)
  // }, [formData.children])

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Fetch all players for parent selection
  const fetchAllPlayers = useCallback(async () => {
    try {
      // Try with no parameters first
      const response = await playersService.getAll()
      if (response.success) {
        const transformed = response.data.map(p => ({
          id: p.id,
          name: { 
            en: `${p.first_name || ''} ${p.last_name || ''}`.trim(), 
            ar: `${p.first_name_ar || p.first_name || ''} ${p.last_name_ar || p.last_name || ''}`.trim()
          },
          branch: p.branch?.name || '',
          status: p.status || 'active'
        }))
        setAllPlayers(transformed)
      } else {
        setAllPlayers([])
      }
    } catch (err) {
      console.error('Error fetching all players:', err)
      setAllPlayers([])
    }
  }, [])

  // Fetch all players on component load
  useEffect(() => {
    const loadPlayers = async () => {
      try {
        // Try with no parameters first
        const response = await playersService.getAll()
        if (response.success) {
          const transformed = response.data.map(p => ({
            id: p.id,
            name: { 
              en: `${p.first_name || ''} ${p.last_name || ''}`.trim(), 
              ar: `${p.first_name_ar || p.first_name || ''} ${p.last_name_ar || p.last_name || ''}`.trim()
            },
            branch: p.branch?.name || '',
            status: p.status || 'active'
          }))
          setAllPlayers(transformed)
        } else {
          setAllPlayers([])
        }
      } catch (err) {
        console.error('Error fetching all players:', err)
        setAllPlayers([])
      }
    }
    
    loadPlayers()
  }, []) // Empty dependency array - run once on mount

  // Fetch all players when parent form is opened (backup)
  useEffect(() => {
    if (showAddForm && activeTab === 'accounts') {
      fetchAllPlayers()
    }
  }, [showAddForm, activeTab, fetchAllPlayers])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const resetForm = () => {
    setFormData({ 
      name: '', nameAr: '', firstName: '', lastName: '',
      phone: '', email: '', password: '', branch: '', branchId: '', program: '', programs: [], programId: '',
      children: [], coachId: '',
      birthDate: '', parentId: '', parentName: '', parentNameAr: '', parentPhone: '', coach: '',
      gender: 'male', idType: 'national_id', idDocument: null, idDocumentPreview: null, healthNotes: '',
      nationality: '', address: '',
      permissions: [], avatar: null, avatarPreview: null
    })
    setParentSearchQuery('') // Reset parent search
    setChildrenSearchQuery('') // Reset children search
    setEditingUser(null)
    setShowPassword(false)
  }

  const handlePermissionToggle = (permissionId) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }))
  }

  const handleSelectAllPermissions = () => {
    const allIds = availablePermissions.map(p => p.id)
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.length === allIds.length ? [] : allIds
    }))
  }

  const handleIdDocumentChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const isImage = file.type.startsWith('image/')
      const isPdf = file.type === 'application/pdf'
      
      if (!isImage && !isPdf) {
        alert(language === 'ar' ? 'الرجاء اختيار صورة أو ملف PDF' : 'Please select an image or PDF file')
        return
      }

      if (isImage) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, idDocument: file, idDocumentPreview: reader.result }))
        }
        reader.readAsDataURL(file)
      } else {
        setFormData(prev => ({ ...prev, idDocument: file, idDocumentPreview: 'pdf' }))
      }
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    
    // Check if this is a player
    const isPlayer = activeTab === 'players'
    
    if (isPlayer) {
      // Handle player-specific fields using preserved original data
      setFormData({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        phone: user.phone || '',
        email: user.email || '',
        password: '',
        branchId: user.branchId || '',
        programId: user.programId || '',
        coachId: user.coach?.id || '',
        birthDate: user.birthDate || user.date_of_birth || '',
        parentId: user.parentId || '',
        parentName: user.parentName || '',
        parentNameAr: user.parentNameAr || '',
        parentPhone: user.parentPhone || user.parent?.phone || '',
        gender: user.gender || 'male',
        idType: 'national_id',
        idDocument: null,
        idDocumentPreview: user.idDocument ? `${FILE_BASE_URL}${user.idDocument}` : null,
        healthNotes: user.healthNotes || user.medical_notes || '',
        nationality: user.nationality || '',
        address: user.address || '',
        avatar: null,
        avatarPreview: user.avatar ? `${FILE_BASE_URL}${user.avatar}` : null,
        // Keep other fields for compatibility
        name: '',
        nameAr: '',
        branch: '',
        program: '',
        programs: [],
        permissions: [],
        coach: ''
      })
    } else {
      // Handle other user types (coaches, admins, etc.)
      // Split name into first/last if available
      const nameParts = (user.name?.en || '').split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      setFormData({
        name: user.name?.en || '',
        nameAr: user.name?.ar || '',
        firstName: firstName,
        lastName: lastName,
        phone: user.phone || '',
        email: user.email || '',
        password: '',
        branch: user.branch || '',
        program: user.program?.en || '',
        programs: user.programs?.map(p => p.id) || [],
        permissions: user.permissions || [],
        children: user.children?.map(c => c.id) || [], // Add children for parents
        birthDate: '',
        parentName: '',
        parentNameAr: '',
        parentPhone: '',
        coach: '',
        idType: 'national_id',
        idDocument: null,
        idDocumentPreview: null,
        healthNotes: '',
        firstNameAr: '',
        lastNameAr: '',
        branchId: user.branchId || '',
        programId: '',
        coachId: '',
        parentId: '',
        gender: 'male',
        avatar: null,
        avatarPreview: user.avatar ? `${FILE_BASE_URL}${user.avatar}` : null
      })
    }
    
    setShowAddForm(true)
    setShowPassword(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate coach programs
      if (activeTab === 'coaches' && (!formData.programs || formData.programs.length === 0)) {
        setError(language === 'ar' ? 'يجب اختيار برنامج واحد على الأقل' : 'At least one program must be selected')
        return
      }

      // Handle player creation separately
      if (activeTab === 'players') {
        const playerData = {
          first_name: formData.firstName,
          last_name: formData.lastName,
          date_of_birth: formData.birthDate,
          gender: formData.gender || 'male',
          parent_id: formData.parentId,
          branch_id: formData.branchId,
          program_id: formData.programId || undefined,
          coach_id: formData.coachId || undefined, // Add selected coach
          medical_notes: formData.healthNotes || undefined,
          nationality: formData.nationality?.trim() || undefined,
          address: formData.address?.trim() || undefined
        }
        
        let response
        if (editingUser) {
          response = await playersService.update(editingUser.id, playerData)
        } else {
          response = await playersService.create(playerData)
        }

        if (response.success) {
          const playerId = editingUser?.id || response.data?.id
          
          // Upload avatar if provided
          if (formData.avatar && playerId) {
            try {
              await playersService.uploadPhoto(playerId, formData.avatar)
            } catch (avatarErr) {
              console.error('Error uploading player avatar:', avatarErr)
            }
          }
          
          // Upload ID document if provided
          if (formData.idDocument && playerId) {
            try {
              await playersService.uploadIdDocument(playerId, formData.idDocument)
            } catch (docErr) {
              console.error('Error uploading player ID document:', docErr)
            }
          }
          
          setSuccessMessage(
            editingUser 
              ? (language === 'ar' ? 'تم تحديث اللاعب بنجاح' : 'Player updated successfully')
              : (language === 'ar' ? 'تم إضافة اللاعب بنجاح' : 'Player added successfully')
          )
          setShowAddForm(false)
          resetForm()
          fetchUsers()
          fetchUserCounts()
        }
        return
      }

      const role = TAB_TO_ROLE[activeTab]
      
      // Prepare user data - use firstName/lastName directly
      const userData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        email: formData.email || undefined,
        role: role,
        is_active: true
      }

      // Add password for new users
      if (!editingUser && formData.password) {
        userData.password = formData.password
      } else if (editingUser && formData.password) {
        userData.password = formData.password
      }

      // Add branch_id if applicable
      if (formData.branch && (activeTab === 'supervisors' || activeTab === 'coaches')) {
        const branch = branches.find(b => b.name.en === formData.branch)
        if (branch) userData.branch_id = branch.id
      }

      // Add permissions for super admins
      if (activeTab === 'superadmins' && formData.permissions.length > 0) {
        userData.permissions = formData.permissions
      }

      // Add programs for coaches
      if (activeTab === 'coaches' && formData.programs.length > 0) {
        userData.programs = formData.programs
      }

      // Add children for parents (always send the array, even if empty)
      if (activeTab === 'accounts' && formData.children !== undefined) {
        userData.children = formData.children
      }

      let response
      if (editingUser) {
        response = await usersService.update(editingUser.id, userData)
      } else {
        response = await usersService.create(userData)
      }

      if (response.success) {
        // Upload avatar if provided
        const userId = editingUser ? editingUser.id : response.data?.id
        if (formData.avatar && userId) {
          try {
            await usersService.uploadAvatar(userId, formData.avatar)
          } catch (avatarErr) {
            console.error('Error uploading avatar:', avatarErr)
          }
        }

        setSuccessMessage(
          editingUser 
            ? (language === 'ar' ? 'تم تحديث المستخدم بنجاح' : 'User updated successfully')
            : (language === 'ar' ? 'تم إنشاء المستخدم بنجاح' : 'User created successfully')
        )
        setShowAddForm(false)
        resetForm()
        fetchUsers()
        fetchUserCounts()
      }
    } catch (err) {
      console.error('Error saving:', JSON.stringify(err, null, 2))
      console.error('Error response:', err.response?.data)
      setError(err.response?.data?.message || err.message || (language === 'ar' ? 'فشل في الحفظ' : 'Failed to save'))
    } finally {
      setLoading(false)
    }
  }

  // Close parent dropdown when clicking outside (modified for always-visible dropdown)
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Clear search if clicking outside and no parent is selected
      if (!event.target.closest('.parent-search-container') && !formData.parentId) {
        setParentSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [formData.parentId])

  const handleConfirmDelete = async () => {
    // Extract user ID correctly - split only on the first hyphen to separate type from ID
    const userId = deleteConfirmId?.includes('-') ? deleteConfirmId.substring(deleteConfirmId.indexOf('-') + 1) : deleteConfirmId
    const userType = deleteConfirmId?.split('-')[0] // Extract user type (players, supervisors, etc.)
    
    if (!userId) return

    setLoading(true)
    try {
      if (deleteType === 'hard') {
        // Use appropriate service based on user type
        if (userType === 'players') {
          await playersService.delete(userId)
        } else {
          await usersService.delete(userId)
        }
      } else {
        await usersService.toggleStatus(userId)
      }
      
      setSuccessMessage(
        deleteType === 'hard'
          ? (language === 'ar' ? 'تم حذف المستخدم بنجاح' : 'User deleted successfully')
          : (language === 'ar' ? 'تم تعطيل المستخدم بنجاح' : 'User deactivated successfully')
      )
      fetchUsers()
      fetchUserCounts()
    } catch (err) {
      console.error('Error deleting user:', err)
      setError(err.message || (language === 'ar' ? 'فشل في حذف المستخدم' : 'Failed to delete user'))
    } finally {
      setLoading(false)
      setDeleteConfirmId(null)
      setDeleteType('soft')
    }
  }

  const getStatusBadge = (status) => {
    if (status === 'active' || status === 'enrolled' || status === 'paid') {
      return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
    } else if (status === 'inactive' || status === 'pending') {
      return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
    } else if (status === 'overdue') {
      return 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
    }
    return 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
  }

  // Filter function
  const filterUsers = (usersList) => {
    return usersList.filter(user => {
      const matchesBranch = filterBranch === 'all' || user.branch === filterBranch
      const matchesSearch = searchQuery === '' || 
        user.name.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.name.ar.includes(searchQuery) ||
        user.phone?.includes(searchQuery)
      return matchesBranch && matchesSearch
    })
  }

  // Get available coaches based on branch and program
  const getAvailableCoaches = () => {
    return users.filter(u => 
      u.status === 'active' &&
      (!formData.branch || u.branch === formData.branch) &&
      (!formData.program || u.programId === parseInt(formData.program))
    )
  }

  const renderAddForm = () => {
    const isEditing = editingUser !== null
    const needsPassword = ['superadmins', 'supervisors', 'coaches', 'accountants', 'accounts'].includes(activeTab) && !isEditing
    const canResetPassword = isEditing && ['superadmins', 'supervisors', 'coaches', 'accountants', 'accounts'].includes(activeTab)
    const isPlayerForm = activeTab === 'players'

    return (
      <GlassCard className="mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-secondary dark:text-white flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                {isEditing ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                )}
              </div>
              {isEditing 
                ? (language === 'ar' ? `تعديل ${tabs.find(t => t.id === activeTab)?.label.ar}` : `Edit ${tabs.find(t => t.id === activeTab)?.label.en}`)
                : (language === 'ar' ? `إضافة ${tabs.find(t => t.id === activeTab)?.label.ar}` : `Add ${tabs.find(t => t.id === activeTab)?.label.en}`)}
            </h3>
            <button
              onClick={() => { setShowAddForm(false); resetForm() }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Player Form */}
            {isPlayerForm ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'الاسم الأول' : 'First Name'} *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={language === 'ar' ? 'مثال: أحمد' : 'e.g., Ahmed'}
                    required
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'اسم العائلة' : 'Last Name'} *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={language === 'ar' ? 'مثال: حسن' : 'e.g., Hassan'}
                    required
                  />
                </div>

                {/* Nationality */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'الجنسية' : 'Nationality'}
                  </label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={language === 'ar' ? 'أدخل الجنسية' : 'Enter nationality'}
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'تاريخ الميلاد' : 'Date of Birth'} *
                  </label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                {/* Parent (custom dropdown with internal search) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'ولي الأمر' : 'Parent'} * 
                    <span className="text-xs text-gray-400 ml-1">({parents.length})</span>
                  </label>
                  <div className="relative">
                    {/* Custom dropdown trigger */}
                    <div
                      onClick={() => {
                        // Toggle dropdown visibility
                        const dropdown = document.getElementById('parent-dropdown');
                        if (dropdown) {
                          dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                          if (dropdown.style.display === 'block') {
                            setParentSearchQuery(''); // Clear search when opening
                          }
                        }
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer flex items-center justify-between"
                    >
                      <span>
                        {formData.parentId 
                          ? parents.find(p => p.id === formData.parentId)?.name[language] || (language === 'ar' ? 'اختر ولي الأمر' : 'Select Parent')
                          : (language === 'ar' ? 'اختر ولي الأمر' : 'Select Parent')
                        }
                      </span>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    
                    {/* Hidden select for form validation */}
                    <select
                      value={formData.parentId || ''}
                      onChange={() => {}} // Handled by custom dropdown
                      className="absolute opacity-0 pointer-events-none w-full h-full"
                    >
                      <option value=""></option>
                      {parents.map(parent => (
                        <option key={parent.id} value={parent.id}>
                          {parent.name[language]}
                        </option>
                      ))}
                    </select>
                    
                    {/* Custom dropdown content */}
                    <div
                      id="parent-dropdown"
                      style={{ display: 'none' }}
                      className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-lg z-50 max-h-64 overflow-hidden"
                    >
                      {/* Search input */}
                      <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                        <div className="relative">
                          <svg className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            value={parentSearchQuery}
                            onChange={(e) => setParentSearchQuery(e.target.value)}
                            placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
                            className="w-full pl-9 rtl:pl-4 rtl:pr-9 pr-4 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      
                      {/* Options list */}
                      <div className="max-h-48 overflow-y-auto">
                        {parents.length === 0 ? (
                          <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">
                            {language === 'ar' ? 'لا يوجد أولياء أمور مسجلين' : 'No parents registered'}
                          </div>
                        ) : parents.filter(parent => 
                          !parentSearchQuery || 
                          parent.name.en.toLowerCase().includes(parentSearchQuery.toLowerCase()) ||
                          parent.name.ar.includes(parentSearchQuery) ||
                          parent.phone.includes(parentSearchQuery)
                        ).length === 0 ? (
                          <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">
                            {language === 'ar' ? 'لا توجد نتائج' : 'No results found'}
                          </div>
                        ) : (
                          parents
                            .filter(parent => 
                              !parentSearchQuery || 
                              parent.name.en.toLowerCase().includes(parentSearchQuery.toLowerCase()) ||
                              parent.name.ar.includes(parentSearchQuery) ||
                              parent.phone.includes(parentSearchQuery)
                            )
                            .map(parent => (
                              <div
                                key={parent.id}
                                onClick={() => {
                                  setFormData({ ...formData, parentId: parent.id });
                                  setParentSearchQuery('');
                                  // Close dropdown
                                  const dropdown = document.getElementById('parent-dropdown');
                                  if (dropdown) dropdown.style.display = 'none';
                                }}
                                className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                              >
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {parent.name[language]}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {parent.phone}
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {parents.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      {language === 'ar' ? 'يجب تسجيل أولياء أمور أولاً من تطبيق الجوال أو صفحة التسجيل' : 'Parents must register first via mobile app or registration page'}
                    </p>
                  )}
                </div>

                {/* Branch */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'الفرع' : 'Branch'} *
                    <span className="text-xs text-gray-400 ml-1">({branches.length})</span>
                  </label>
                  <select
                    value={formData.branchId || ''}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value, programId: '' })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">
                      {branches.length === 0 
                        ? (language === 'ar' ? 'لا توجد فروع' : 'No branches')
                        : (language === 'ar' ? 'اختر الفرع' : 'Select Branch')}
                    </option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name[language]}</option>
                    ))}
                  </select>
                </div>

                {/* Program (optional) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'البرنامج' : 'Program'}
                    <span className="text-xs text-gray-400 ml-1">
                      ({programs.filter(p => !formData.branchId || p.branch_id === formData.branchId).length})
                    </span>
                  </label>
                  <select
                    value={formData.programId || ''}
                    onChange={(e) => setFormData({ ...formData, programId: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">{language === 'ar' ? 'بدون برنامج (اختياري)' : 'No Program (optional)'}</option>
                    {programs
                      .filter(p => !formData.branchId || p.branch_id === formData.branchId)
                      .map(program => (
                        <option key={program.id} value={program.id}>
                          {program.name[language]}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Coach (selectable based on program coaches) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'المدرب' : 'Coach'}
                  </label>
                  <select
                    value={formData.coachId || ''}
                    onChange={(e) => setFormData({ ...formData, coachId: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/10 text-gray-700 dark:text-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    disabled={!formData.programId}
                  >
                    <option value="">
                      {formData.programId 
                        ? (language === 'ar' ? 'اختر مدرب' : 'Select a coach')
                        : (language === 'ar' ? 'اختر برنامج أولاً' : 'Select a program first')
                      }
                    </option>
                    {(() => {
                      const selectedProgram = programs.find(p => p.id === formData.programId);
                      return selectedProgram?.coaches?.map(coach => (
                        <option key={coach.id} value={coach.id}>
                          {`${coach.first_name} ${coach.last_name}`}
                        </option>
                      ));
                    })()}
                  </select>
                  {(() => {
                    const selectedProgram = programs.find(p => p.id === formData.programId);
                    return selectedProgram?.coaches && selectedProgram.coaches.length > 0 && formData.coachId && (
                      <p className="text-xs text-green-600 mt-1">
                        {language === 'ar' ? 'تم اختيار المدرب' : 'Coach selected'}
                      </p>
                    );
                  })()}
                </div>

                {/* Address */}
                <div className="md:col-span-2 lg:col-span-4">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'العنوان' : 'Address'}
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={language === 'ar' ? 'أدخل العنوان' : 'Enter address'}
                  />
                </div>

                {/* Player Photo */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'صورة اللاعب' : 'Player Photo'}
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative group">
                      {formData.avatarPreview ? (
                        <img 
                          src={formData.avatarPreview} 
                          alt="Player" 
                          className="w-16 h-16 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                          {formData.firstName ? formData.firstName.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => playerAvatarInputRef.current?.click()}
                        className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                      <input
                        ref={playerAvatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onloadend = () => setFormData(prev => ({ ...prev, avatar: file, avatarPreview: reader.result }))
                            reader.readAsDataURL(file)
                          }
                        }}
                        className="hidden"
                      />
                    </div>
                    <p className="text-xs text-gray-400">{language === 'ar' ? 'انقر للتغيير' : 'Click to change'}</p>
                  </div>
                </div>

                {/* ID Document */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'صورة الهوية' : 'ID Document'}
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative group">
                      {formData.idDocumentPreview ? (
                        <img 
                          src={formData.idDocumentPreview} 
                          alt="ID" 
                          className="w-16 h-16 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => playerIdDocInputRef.current?.click()}
                        className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </button>
                      <input
                        ref={playerIdDocInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onloadend = () => setFormData(prev => ({ ...prev, idDocument: file, idDocumentPreview: reader.result }))
                            reader.readAsDataURL(file)
                          }
                        }}
                        className="hidden"
                      />
                    </div>
                    <p className="text-xs text-gray-400">{language === 'ar' ? 'انقر للتغيير' : 'Click to change'}</p>
                  </div>
                </div>

                {/* Health Notes (optional) */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'ملاحظات صحية' : 'Health Notes'}
                  </label>
                  <textarea
                    value={formData.healthNotes}
                    onChange={(e) => setFormData({ ...formData, healthNotes: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={language === 'ar' ? 'أي ملاحظات صحية أو حساسية...' : 'Any health notes or allergies...'}
                    rows={2}
                  />
                </div>
              </div>
            ) : (
              /* Non-Player Forms */
              <div className="space-y-4">
                {/* Avatar Upload */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative group">
                    {formData.avatarPreview ? (
                      <img 
                        src={formData.avatarPreview} 
                        alt="Avatar" 
                        className="w-20 h-20 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                        {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onloadend = () => setFormData(prev => ({ ...prev, avatar: file, avatarPreview: reader.result }))
                          reader.readAsDataURL(file)
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-secondary dark:text-white">
                      {language === 'ar' ? 'صورة المستخدم' : 'User Photo'}
                    </p>
                    <p className="text-xs text-gray-400">{language === 'ar' ? 'انقر للتغيير (اختياري)' : 'Click to change (optional)'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'الاسم الأول' : 'First Name'} *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={language === 'ar' ? 'أحمد' : 'Ahmed'}
                    required
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'الاسم الأخير' : 'Last Name'} *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={language === 'ar' ? 'حسن' : 'Hassan'}
                    required
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'ar' ? 'رقم الجوال' : 'Phone Number'} *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="+966 50 XXX XXXX"
                    required
                  />
                </div>

                {/* Email (for accountants and super admins) */}
                {(activeTab === 'accountants' || activeTab === 'superadmins') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'ar' ? 'البريد الإلكتروني' : 'Email'} *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="email@example.com"
                      required
                    />
                  </div>
                )}

                {/* Branch (for supervisors and coaches) */}
                {(activeTab === 'supervisors' || activeTab === 'coaches') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'ar' ? 'الفرع' : 'Branch'} *
                    </label>
                    <select
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="">{language === 'ar' ? 'اختر فرع' : 'Select branch'}</option>
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.name.en}>{branch.name[language]}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Children (for parents) */}
                {activeTab === 'accounts' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'ar' ? 'ربط بالأبناء' : 'Connect with Children'}
                      <span className="text-xs text-gray-400 ml-1">({language === 'ar' ? 'اختياري' : 'Optional'})</span>
                    </label>
                    
                    {/* Search bar for children */}
                    <div className="relative mb-3">
                      <svg className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        value={childrenSearchQuery}
                        onChange={(e) => setChildrenSearchQuery(e.target.value)}
                        placeholder={language === 'ar' ? 'بحث عن لاعب...' : 'Search for a player...'}
                        className="w-full pl-9 rtl:pl-4 rtl:pr-9 pr-4 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    
                    {/* Children checkboxes with search filter */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-3 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5">
                      {allPlayers
                        .filter(player => player.status === 'active') // Get only active players
                        .filter(player => 
                          !childrenSearchQuery || 
                          player.name.en.toLowerCase().includes(childrenSearchQuery.toLowerCase()) ||
                          player.name.ar.includes(childrenSearchQuery) ||
                          player.branch.toLowerCase().includes(childrenSearchQuery.toLowerCase())
                        )
                        .map(player => (
                            <label key={player.id} className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg cursor-pointer">
                              <input
                                type="checkbox"
                                key={`checkbox-${player.id}`}
                                value={player.id}
                                checked={formData.children?.includes(player.id)}
                                onChange={(e) => {
                                  e.preventDefault()
                                  const playerId = player.id
                                  const isChecked = e.target.checked
                                  
                                  // Use functional update to ensure proper state change
                                  setFormData(prev => {
                                    const children = prev.children || []
                                    const newChildren = isChecked 
                                      ? [...children, playerId]
                                      : children.filter(id => id !== playerId)
                                    return { ...prev, children: newChildren }
                                  })
                                }}
                                className="w-4 h-4 text-purple-500 border-gray-300 rounded focus:ring-purple-500"
                              />
                              <div>
                                <div className="font-medium text-gray-800 dark:text-white">{player.name?.[language]}</div>
                                <div className="text-xs text-gray-500">{player.branch}</div>
                              </div>
                            </label>
                          ))
                      }
                      {allPlayers.filter(player => player.status === 'active').filter(player => 
                        !childrenSearchQuery || 
                        player.name.en.toLowerCase().includes(childrenSearchQuery.toLowerCase()) ||
                        player.name.ar.includes(childrenSearchQuery) ||
                        player.branch.toLowerCase().includes(childrenSearchQuery.toLowerCase())
                      ).length === 0 && (
                        <div className="col-span-2 text-center text-gray-500 py-4">
                          {childrenSearchQuery 
                            ? (language === 'ar' ? 'لا توجد نتائج للبحث' : 'No search results found')
                            : (language === 'ar' ? 'لا يوجد لاعبين نشطين للربط' : 'No active players available to connect')
                          }
                        </div>
                      )}
                    </div>
                    
                    {/* Selected children count */}
                    {formData.children && formData.children.length > 0 && (
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-green-600">
                          {language === 'ar' ? `تم اختيار ${formData.children.length} أبناء` : `Selected ${formData.children.length} child(ren)`}
                        </p>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, children: [] }))}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          {language === 'ar' ? 'إزالة الكل' : 'Remove All'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Programs (for coaches) */}
                {activeTab === 'coaches' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'ar' ? 'البرامج' : 'Programs'} *
                      <span className="text-xs text-gray-400 ml-1">({programs.length})</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-3 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5">
                      {programs.map(program => (
                        <label key={program.id} className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            value={program.id}
                            checked={formData.programs?.includes(program.id) || false}
                            onChange={(e) => {
                              const programId = e.target.value
                              if (e.target.checked) {
                                setFormData(prev => ({ ...prev, programs: [...(prev.programs || []), programId] }))
                              } else {
                                setFormData(prev => ({ ...prev, programs: (prev.programs || []).filter(id => id !== programId) }))
                              }
                            }}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {program.name[language]}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({program.ageRange} {language === 'ar' ? 'سنة' : 'yrs'})
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                    {formData.programs && formData.programs.length > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        {language === 'ar' ? `تم اختيار ${formData.programs.length} برامج` : `Selected ${formData.programs.length} program(s)`}
                      </p>
                    )}
                  </div>
                )}

                {/* Password (for staff users when creating) */}
                {needsPassword && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'ar' ? 'كلمة المرور' : 'Password'} *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 pr-12"
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {language === 'ar' 
                        ? 'المستخدم يمكنه تغيير كلمة المرور بعد أول تسجيل دخول' 
                        : 'User can change password after first login'}
                    </p>
                  </div>
                )}

                {/* Reset Password option when editing */}
                {canResetPassword && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      {language === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 pr-12"
                        placeholder={language === 'ar' ? 'اتركه فارغاً إذا لم ترد التغيير' : 'Leave empty to keep current'}
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                </div>
              </div>
            )}

            {/* Super Admin Permissions */}
            {activeTab === 'superadmins' && (
              <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    {language === 'ar' ? 'الصلاحيات' : 'Permissions'}
                  </h4>
                  <button
                    type="button"
                    onClick={handleSelectAllPermissions}
                    className="text-xs text-amber-700 dark:text-amber-400 hover:underline"
                  >
                    {formData.permissions.length === availablePermissions.length 
                      ? (language === 'ar' ? 'إلغاء تحديد الكل' : 'Deselect All')
                      : (language === 'ar' ? 'تحديد الكل' : 'Select All')}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {availablePermissions.map((permission) => (
                    <label 
                      key={permission.id}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                        formData.permissions.includes(permission.id)
                          ? 'bg-amber-100 dark:bg-amber-500/20 border-2 border-amber-500'
                          : 'bg-white dark:bg-white/5 border-2 border-transparent hover:border-amber-300 dark:hover:border-amber-500/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(permission.id)}
                        onChange={() => handlePermissionToggle(permission.id)}
                        className="sr-only"
                      />
                      <span className="text-xl">{permission.icon}</span>
                      <span className={`text-sm font-medium ${
                        formData.permissions.includes(permission.id)
                          ? 'text-amber-800 dark:text-amber-300'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {permission.label[language]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
                <Button 
                  type="submit" 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  disabled={loading}
                >
                  {loading ? (
                    <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {isEditing 
                    ? (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
                    : (language === 'ar' ? 'إضافة' : 'Add')}
                </Button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); resetForm() }}
                  className="px-6 py-2 text-gray-600 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
          </form>
        </div>
      </GlassCard>
    )
  }

  const renderUserRow = (user, type) => {
    const isExpanded = expandedUserId === `${type}-${user.id}`
    const isDeleting = deleteConfirmId === `${type}-${user.id}`

    return (
      <div key={user.id}>
        <div className={`hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${isExpanded ? 'bg-gray-50 dark:bg-white/5' : ''}`}>
          {/* Desktop View */}
          <div className="hidden md:flex px-6 py-4 items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              {user.avatar ? (
                <img 
                  src={`${FILE_BASE_URL}${user.avatar}`} 
                  alt={user.name.en} 
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                  {user.name.en.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-secondary dark:text-white truncate">{user.name.en}</p>
                <p className="text-sm text-gray-500 truncate">{user.phone}</p>
              </div>
            </div>

            {(type === 'supervisors' || type === 'coaches') && (
              <div className="min-w-[120px]">
                <p className="text-sm text-gray-600 dark:text-gray-300">{language === 'ar' ? user.branchAr : user.branch}</p>
              </div>
            )}
            {type === 'coaches' && (
              <div className="hidden lg:block min-w-[150px] max-w-[200px]">
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate" title={user.program?.[language] || '-'}>
                  {user.programs?.length > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="truncate max-w-[120px]">{user.programs[0]?.name_ar || user.programs[0]?.name}</span>
                      {user.programs.length > 1 && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs rounded-full">
                          +{user.programs.length - 1}
                        </span>
                      )}
                    </span>
                  ) : '-'}
                </p>
              </div>
            )}
            {(type === 'accountants' || type === 'superadmins') && (
              <div className="min-w-[180px]">
                <p className="text-sm text-gray-600 dark:text-gray-300">{user.email}</p>
              </div>
            )}

            <div className="min-w-[80px]">
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusBadge(user.status)}`}>
                {user.status === 'active' ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setExpandedUserId(isExpanded ? null : `${type}-${user.id}`)}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
              >
                <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button onClick={() => handleEdit(user)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button onClick={() => setDeleteConfirmId(`${type}-${user.id}`)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile View - Card Layout */}
          <div className="md:hidden p-4">
            <div className="flex items-start gap-3">
              {user.avatar ? (
                <img 
                  src={`${FILE_BASE_URL}${user.avatar}`} 
                  alt={user.name.en} 
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  {user.name.en.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="font-semibold text-secondary dark:text-white truncate">{user.name.en}</p>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full flex-shrink-0 ${getStatusBadge(user.status)}`}>
                    {user.status === 'active' ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-2">{user.phone}</p>
                
                {/* Role-specific info */}
                <div className="flex flex-wrap gap-2 text-xs">
                  {(type === 'supervisors' || type === 'coaches') && user.branch && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded-lg">
                      📍 {language === 'ar' ? user.branchAr : user.branch}
                    </span>
                  )}
                  {type === 'coaches' && user.programs?.length > 0 && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg">
                      📋 {user.programs.length} {language === 'ar' ? 'برنامج' : 'program(s)'}
                    </span>
                  )}
                  {(type === 'accountants' || type === 'superadmins') && user.email && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded-lg truncate max-w-[200px]">
                      ✉️ {user.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Mobile Actions */}
            <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
              <button
                onClick={() => setExpandedUserId(isExpanded ? null : `${type}-${user.id}`)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
              >
                <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {language === 'ar' ? 'تفاصيل' : 'Details'}
              </button>
              <button onClick={() => handleEdit(user)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {language === 'ar' ? 'تعديل' : 'Edit'}
              </button>
              <button onClick={() => setDeleteConfirmId(`${type}-${user.id}`)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {language === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>

          {isDeleting && (
            <div className="px-6 pb-4">
              <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20">
                <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-3">
                  {language === 'ar' ? `هل أنت متأكد من حذف "${user.name.en}"؟` : `Delete "${user.name.en}"?`}
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <label className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-white/10 rounded-lg cursor-pointer">
                    <input type="radio" value="soft" checked={deleteType === 'soft'} onChange={() => setDeleteType('soft')} className="w-4 h-4" />
                    <span className="text-sm">{language === 'ar' ? 'تعطيل' : 'Deactivate'}</span>
                  </label>
                  <label className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-white/10 rounded-lg cursor-pointer">
                    <input type="radio" value="hard" checked={deleteType === 'hard'} onChange={() => setDeleteType('hard')} className="w-4 h-4" />
                    <span className="text-sm text-red-600">{language === 'ar' ? 'حذف نهائي' : 'Delete'}</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleConfirmDelete} disabled={loading} className={`px-4 py-2 text-sm font-semibold text-white rounded-lg ${deleteType === 'hard' ? 'bg-red-500' : 'bg-yellow-500'} disabled:opacity-50`}>
                    {loading ? '...' : (language === 'ar' ? 'تأكيد' : 'Confirm')}
                  </button>
                  <button onClick={() => { setDeleteConfirmId(null); setDeleteType('soft') }} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg">
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isExpanded && !isDeleting && (
            <div className="px-6 pb-4">
              <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'الجوال' : 'Phone'}</p>
                    <p className="text-sm font-medium text-secondary dark:text-white">{user.phone}</p>
                  </div>
                  {user.email && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'البريد' : 'Email'}</p>
                      <p className="text-sm font-medium text-secondary dark:text-white">{user.email}</p>
                    </div>
                  )}
                  {user.branch && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'الفرع' : 'Branch'}</p>
                      <p className="text-sm font-medium text-secondary dark:text-white">{language === 'ar' ? user.branchAr : user.branch}</p>
                    </div>
                  )}
                  {user.lastActive && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'آخر نشاط' : 'Last Active'}</p>
                      <p className="text-sm font-medium text-secondary dark:text-white">{user.lastActive}</p>
                    </div>
                  )}
                </div>
                {/* Programs section for coaches */}
                {user.programs && user.programs.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                    <p className="text-xs text-gray-500 mb-2">{language === 'ar' ? 'البرامج' : 'Programs'}</p>
                    <div className="flex flex-wrap gap-2">
                      {user.programs.map(program => (
                        <span key={program.id} className="px-3 py-1.5 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-sm rounded-lg">
                          {language === 'ar' ? (program.name_ar || program.name) : program.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="border-b border-gray-100 dark:border-white/5"></div>
      </div>
    )
  }

  const getCoachDisplayName = (coach) => {
    if (!coach) return '-'
    const fullName = `${coach.first_name || ''} ${coach.last_name || ''}`.trim()
    if (language === 'ar') {
      return coach.name_ar || fullName || '-'
    }
    return fullName || coach.name_ar || '-'
  }

  const renderPlayersTable = () => (
    <div>
      {/* Desktop Table */}
      <table className="hidden md:table w-full">
        <thead>
          <tr className="bg-gray-50 dark:bg-white/5 text-left rtl:text-right">
            <th className="px-6 py-4 text-sm font-semibold text-gray-500">{language === 'ar' ? 'الاسم' : 'Name'}</th>
            <th className="px-6 py-4 text-sm font-semibold text-gray-500">{language === 'ar' ? 'الهوية' : 'ID Doc'}</th>
            <th className="px-6 py-4 text-sm font-semibold text-gray-500">{language === 'ar' ? 'الجوال' : 'Phone'}</th>
            <th className="px-6 py-4 text-sm font-semibold text-gray-500">{language === 'ar' ? 'ولي الأمر' : 'Parent'}</th>
            <th className="px-6 py-4 text-sm font-semibold text-gray-500">{language === 'ar' ? 'الفرع' : 'Branch'}</th>
            <th className="px-6 py-4 text-sm font-semibold text-gray-500">{language === 'ar' ? 'البرنامج' : 'Program'}</th>
            <th className="px-6 py-4 text-sm font-semibold text-gray-500">{language === 'ar' ? 'المدرب' : 'Coach'}</th>
            <th className="px-6 py-4 text-sm font-semibold text-gray-500">{language === 'ar' ? 'الحالة' : 'Status'}</th>
            <th className="px-6 py-4 text-sm font-semibold text-gray-500">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
          {users.map((player) => {
            const isUnassigned = !player.programId || !player.coach?.id
            return (
            <tr key={player.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                    {player.avatar ? (
                      <img 
                        src={`${FILE_BASE_URL}${player.avatar}`} 
                        alt={player.name?.[language]} 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                      />
                    ) : null}
                    <span style={{ display: player.avatar ? 'none' : 'flex' }} className="w-full h-full items-center justify-center">
                      {player.name?.en?.charAt(0) || '?'}
                    </span>
                  </div>
                  <span className="font-semibold text-secondary dark:text-white">{player.name?.[language] || '-'}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                {player.idDocument ? (
                  <a 
                    href={`${FILE_BASE_URL}${player.idDocument}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {language === 'ar' ? 'عرض' : 'View'}
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">-</span>
                )}
              </td>
              <td className="px-6 py-4 text-gray-600 dark:text-gray-300" dir="ltr">{player.selfUserPhone || '-'}</td>
              <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{player.parentName || '-'}</td>
              <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{language === 'ar' ? player.branchAr : player.branch}</td>
              <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{player.program?.[language] || '-'}</td>
              <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{getCoachDisplayName(player.coach)}</td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusBadge(player.status)}`}>
                  {player.status === 'active' ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  {isUnassigned && (
                    <button
                      onClick={() => handleEdit(player)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-amber-500 text-white hover:bg-amber-600"
                    >
                      {language === 'ar' ? 'تعيين' : 'Assign'}
                    </button>
                  )}
                  <button onClick={() => handleEdit(player)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => setDeleteConfirmId(`players-${player.id}`)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          )})}
        </tbody>
      </table>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-gray-100 dark:divide-white/5">
        {users.map((player) => {
          const isUnassigned = !player.programId || !player.coach?.id
          return (
          <div key={player.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                {player.avatar ? (
                  <img 
                    src={`${FILE_BASE_URL}${player.avatar}`} 
                    alt={player.name?.[language]} 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                  />
                ) : null}
                <span style={{ display: player.avatar ? 'none' : 'flex' }} className="w-full h-full items-center justify-center">
                  {player.name?.en?.charAt(0) || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="font-semibold text-secondary dark:text-white truncate">{player.name?.[language] || '-'}</p>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full flex-shrink-0 ${getStatusBadge(player.status)}`}>
                    {player.status === 'active' ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                  </span>
                </div>
                
                {/* Info badges */}
                <div className="flex flex-wrap gap-2 text-xs mt-2">
                  {player.selfUserPhone && (
                    <span className="px-2 py-1 bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded-lg" dir="ltr">
                      {player.selfUserPhone}
                    </span>
                  )}
                  {player.parentName && (
                    <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                      👨‍👩‍👦 {player.parentName}
                    </span>
                  )}
                  {player.branch && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded-lg">
                      📍 {language === 'ar' ? player.branchAr : player.branch}
                    </span>
                  )}
                  {player.program?.[language] && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg">
                      📋 {player.program[language]}
                    </span>
                  )}
                  {player.coach && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg">
                      🧑‍🏫 {getCoachDisplayName(player.coach)}
                    </span>
                  )}
                  {player.idDocument && (
                    <a
                      href={`${FILE_BASE_URL}${player.idDocument}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors"
                    >
                      📄 {language === 'ar' ? 'الهوية' : 'ID Doc'}
                    </a>
                  )}
                </div>
              </div>
            </div>
            
            {/* Mobile Actions */}
            <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
              {isUnassigned && (
                <button onClick={() => handleEdit(player)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg">
                  {language === 'ar' ? 'تعيين' : 'Assign'}
                </button>
              )}
              <button onClick={() => handleEdit(player)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {language === 'ar' ? 'تعديل' : 'Edit'}
              </button>
              <button onClick={() => setDeleteConfirmId(`players-${player.id}`)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {language === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        )})}
      </div>
    </div>
  )

  const renderAccountsTable = () => (
    <div>
      {/* Desktop Table */}
      <table className="hidden md:table w-full">
        <thead>
          <tr className="bg-gray-50 dark:bg-white/5 text-left rtl:text-right">
            <th className="px-6 py-4 text-sm font-semibold text-gray-500">{language === 'ar' ? 'الاسم' : 'Name'}</th>
            <th className="px-6 py-4 text-sm font-semibold text-gray-500">{language === 'ar' ? 'الجوال' : 'Phone'}</th>
            <th className="px-6 py-4 text-sm font-semibold text-gray-500">{language === 'ar' ? 'تاريخ التسجيل' : 'Registered'}</th>
            <th className="px-6 py-4 text-sm font-semibold text-gray-500">{language === 'ar' ? 'الأبناء' : 'Children'}</th>
            <th className="px-6 py-4 text-sm font-semibold text-gray-500">{language === 'ar' ? 'الحالة' : 'Status'}</th>
            <th className="px-6 py-4 text-sm font-semibold text-gray-500">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
          {users.map((acc) => (
            <tr key={acc.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  {acc.avatar ? (
                    <img
                      src={`${FILE_BASE_URL}${acc.avatar}`}
                      alt={acc.name?.en || 'User'}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center text-white font-bold">
                      {acc.name?.en?.charAt(0) || '?'}
                    </div>
                  )}
                  <span className="font-semibold text-secondary dark:text-white">{acc.name[language]}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{acc.phone}</td>
              <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{acc.registered}</td>
              <td className="px-6 py-4">
                {acc.children_count > 0 ? (
                  <div className="group relative">
                    <span className={`font-bold text-emerald-500 cursor-help`}>{acc.children_count}</span>
                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 bg-gray-800 text-white text-xs rounded-lg p-2 shadow-lg w-64">
                      <div className="font-semibold mb-1">{language === 'ar' ? 'الأبناء المرتبطون:' : 'Connected Children:'}</div>
                      {acc.children?.map(child => (
                        <div key={child.id} className="text-gray-300">
                          {`${child.first_name || ''} ${child.last_name || ''}`.trim()} {child.branch ? `(${child.branch.name})` : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <span className="font-bold text-yellow-500">0</span>
                )}
              </td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusBadge(acc.status)}`}>
                  {acc.status === 'enrolled' ? (language === 'ar' ? 'مسجل أبناء' : 'Enrolled') : (language === 'ar' ? 'بدون أبناء' : 'No Children')}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(acc)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                    title={language === 'ar' ? 'تعديل' : 'Edit'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(acc.id, 'hard')}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    title={language === 'ar' ? 'حذف' : 'Delete'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-gray-100 dark:divide-white/5">
        {users.map((acc) => (
          <div key={acc.id} className="p-4">
            <div className="flex items-start gap-3">
              {acc.avatar ? (
                <img
                  src={`${FILE_BASE_URL}${acc.avatar}`}
                  alt={acc.name?.en || 'User'}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  {acc.name?.en?.charAt(0) || '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="font-semibold text-secondary dark:text-white truncate">{acc.name[language]}</p>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full flex-shrink-0 ${getStatusBadge(acc.status)}`}>
                    {acc.status === 'enrolled' ? (language === 'ar' ? 'مسجل' : 'Enrolled') : (language === 'ar' ? 'بدون أبناء' : 'No Children')}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-2">{acc.phone}</p>
                
                {/* Info badges */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={`px-2 py-1 rounded-lg ${acc.children_count > 0 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'}`}>
                    👨‍👩‍👦 {acc.children_count} {language === 'ar' ? 'أبناء' : 'children'}
                  </span>
                  {acc.registered && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded-lg">
                      📅 {acc.registered}
                    </span>
                  )}
                </div>

                {/* Children list on mobile */}
                {acc.children_count > 0 && acc.children?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/10">
                    <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'الأبناء:' : 'Children:'}</p>
                    <div className="flex flex-wrap gap-1">
                      {acc.children.map(child => (
                        <span key={child.id} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs rounded">
                          {`${child.first_name || ''} ${child.last_name || ''}`.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Mobile Actions */}
            <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
              <button onClick={() => handleEdit(acc)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {language === 'ar' ? 'تعديل' : 'Edit'}
              </button>
              <button onClick={() => handleDelete(acc.id, 'hard')} className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {language === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderUsersList = () => {
    if (loading && users.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-gray-500">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      )
    }

    if (activeTab === 'players') {
      if (users.length === 0) {
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-gray-500">{language === 'ar' ? 'لا يوجد لاعبون' : 'No players found'}</p>
          </div>
        )
      }
      return renderPlayersTable()
    }

    if (activeTab === 'accounts') {
      if (users.length === 0) {
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-gray-500">{language === 'ar' ? 'لا يوجد حسابات مسجلة' : 'No registered accounts'}</p>
          </div>
        )
      }
      return renderAccountsTable()
    }

    const filteredUsers = filterUsers(users)

    if (filteredUsers.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-gray-500">{language === 'ar' ? 'لا يوجد مستخدمون' : 'No users found'}</p>
        </div>
      )
    }

    // Render table header based on active tab - hidden on mobile
    const renderTableHeader = () => {
      if (activeTab === 'coaches') {
        return (
          <div className="hidden md:flex px-6 py-4 bg-gray-50 dark:bg-white/5 items-center justify-between text-sm font-semibold text-gray-500 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-10"></div>
              <div className="flex-1 min-w-0">{language === 'ar' ? 'الاسم' : 'Name'}</div>
            </div>
            <div className="min-w-[120px]">{language === 'ar' ? 'الفرع' : 'Branch'}</div>
            <div className="hidden lg:block min-w-[150px]">{language === 'ar' ? 'البرنامج' : 'Program'}</div>
            <div className="min-w-[80px]">{language === 'ar' ? 'الحالة' : 'Status'}</div>
            <div className="w-[120px] text-center">{language === 'ar' ? 'إجراءات' : 'Actions'}</div>
          </div>
        )
      }
      if (activeTab === 'supervisors') {
        return (
          <div className="hidden md:flex px-6 py-4 bg-gray-50 dark:bg-white/5 items-center justify-between text-sm font-semibold text-gray-500 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-10"></div>
              <div className="flex-1 min-w-0">{language === 'ar' ? 'الاسم' : 'Name'}</div>
            </div>
            <div className="min-w-[120px]">{language === 'ar' ? 'الفرع' : 'Branch'}</div>
            <div className="min-w-[80px]">{language === 'ar' ? 'الحالة' : 'Status'}</div>
            <div className="w-[120px] text-center">{language === 'ar' ? 'إجراءات' : 'Actions'}</div>
          </div>
        )
      }
      if (activeTab === 'accountants') {
        return (
          <div className="hidden md:flex px-6 py-4 bg-gray-50 dark:bg-white/5 items-center justify-between text-sm font-semibold text-gray-500 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-10"></div>
              <div className="flex-1 min-w-0">{language === 'ar' ? 'الاسم' : 'Name'}</div>
            </div>
            <div className="min-w-[180px]">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</div>
            <div className="min-w-[80px]">{language === 'ar' ? 'الحالة' : 'Status'}</div>
            <div className="w-[120px] text-center">{language === 'ar' ? 'إجراءات' : 'Actions'}</div>
          </div>
        )
      }
      if (activeTab === 'superadmins') {
        return (
          <div className="hidden md:flex px-6 py-4 bg-gray-50 dark:bg-white/5 items-center justify-between text-sm font-semibold text-gray-500 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-10"></div>
              <div className="flex-1 min-w-0">{language === 'ar' ? 'الاسم' : 'Name'}</div>
            </div>
            <div className="min-w-[180px]">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</div>
            <div className="min-w-[80px]">{language === 'ar' ? 'الحالة' : 'Status'}</div>
            <div className="w-[120px] text-center">{language === 'ar' ? 'إجراءات' : 'Actions'}</div>
          </div>
        )
      }
      return null
    }

    return (
      <div>
        {renderTableHeader()}
        <div className="divide-y divide-gray-100 dark:divide-white/5">
          {filteredUsers.map(user => renderUserRow(user, activeTab))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-emerald-500 text-white rounded-xl shadow-lg flex items-center gap-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-2 hover:opacity-80">✕</button>
        </div>
      )}

      {error && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-red-500 text-white rounded-xl shadow-lg flex items-center gap-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 hover:opacity-80">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold text-secondary dark:text-white">
              {language === 'ar' ? 'إدارة المستخدمين' : 'Users Management'}
            </h1>
            {isOwner && (
              <span className="px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full">
                {language === 'ar' ? 'المالك' : 'Owner'}
              </span>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'ar' ? 'إدارة جميع المستخدمين في النظام' : 'Manage all users in the system'}
          </p>
        </div>
        {!showAddForm && (
          <Button onClick={() => { setShowAddForm(true); resetForm() }} className="bg-gradient-to-r from-purple-500 to-pink-500">
            <svg className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {language === 'ar' ? `إضافة ${tabs.find(t => t.id === activeTab)?.label.ar}` : `Add ${tabs.find(t => t.id === activeTab)?.label.en}`}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setShowAddForm(false); resetForm(); setExpandedUserId(null); setDeleteConfirmId(null) }}
            className={`px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? tab.ownerOnly 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : tab.ownerOnly
                  ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                  : 'bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            {tab.label[language]}
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-200 dark:bg-white/10'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && renderAddForm()}

      {/* Filter and Search */}
      {['superadmins', 'coaches', 'supervisors', 'accountants', 'players', 'accounts'].includes(activeTab) && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <svg className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ar' ? 'بحث بالاسم أو الجوال...' : 'Search by name or phone...'}
              className="w-full pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          {(activeTab === 'coaches' || activeTab === 'supervisors') && branches.length > 0 && (
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">{language === 'ar' ? 'جميع الفروع' : 'All Branches'}</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.name.en}>{branch.name[language]}</option>
              ))}
            </select>
          )}
          {activeTab === 'players' && (
            <select
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">{language === 'ar' ? 'الكل' : 'All'}</option>
              <option value="assigned">{language === 'ar' ? 'معيّن' : 'Assigned'}</option>
              <option value="unassigned">{language === 'ar' ? 'غير معيّن' : 'Unassigned'}</option>
            </select>
          )}
        </div>
      )}

      {/* Users List */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          {renderUsersList()}
        </div>
      </GlassCard>
    </div>
  )
}
