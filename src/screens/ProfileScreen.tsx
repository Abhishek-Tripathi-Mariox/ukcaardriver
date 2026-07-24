import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Asset } from 'react-native-image-picker';
import DriverIdCardModal from '../components/DriverIdCardModal';
import { fetchCurrentUser, fetchMyDashboard, uploadAvatar, updateProfile } from '../services/api';
import { pickImageFromSource } from '../services/imagePicker';
import {
  BackArrowIcon,
  BankIcon,
  CarOutlineIcon,
  ChevronRightIcon,
  ClockSmallIcon,
  DocumentIcon,
  EmailIcon,
  GiftIcon,
  HelpIcon,
  ClipboardListIcon,
  LogoutIcon,
  MapPinIcon,
  PhoneIcon,
  TabProfileIcon,
  WalletIcon,
} from '../components/icons/ServiceTypeIcons';

interface ProfileScreenProps {
  onBack?: () => void;
  onLogout?: () => void;
  onOpenDocuments?: () => void;
  onOpenBankDetails?: () => void;
  onOpenHistory?: () => void;
  onOpenWallet?: () => void;
  onOpenRefer?: () => void;
  onOpenHelp?: () => void;
  onOpenDriverInstructions?: () => void;
  onOpenOnePass?: () => void;
  onOpenIncentives?: () => void;
  onOpenRouteChange?: () => void;
  /** Route change only applies to scheduled-shuttle drivers. */
  serviceType?: 'instant' | 'private' | 'scheduled';
}

const formatRupees = (n: number): string => {
  try {
    return `₹${new Intl.NumberFormat('en-IN').format(n)}`;
  } catch {
    return `₹${n}`;
  }
};

interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  color?: string;
  onPress?: () => void;
}

function MenuRow({ icon, label, color = '#1E293B', onPress }: MenuRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center border-b border-[#F1F5F9] px-6 py-4"
    >
      <View className="w-8">{icon}</View>
      <Text className="flex-1 text-base" style={{ color }}>
        {label}
      </Text>
      {color !== '#E02D3C' && <ChevronRightIcon size={16} color="#99A1AF" />}
    </Pressable>
  );
}

export function ProfileScreen({
  onBack,
  onLogout,
  onOpenDocuments,
  onOpenBankDetails,
  onOpenHistory,
  onOpenWallet,
  onOpenRefer,
  onOpenHelp,
  onOpenDriverInstructions,
  onOpenOnePass,
  onOpenIncentives,
  onOpenRouteChange,
  serviceType,
}: ProfileScreenProps) {
  const [idCardOpen, setIdCardOpen] = useState(false);
  const [user, setUser] = useState<Awaited<ReturnType<typeof fetchCurrentUser>>>(null);
  const [stats, setStats] = useState<{
    totalEarnings: number;
    totalServices: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editFirst, setEditFirst] = useState('');
  const [editLast, setEditLast] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const openEdit = () => {
    setEditFirst(user?.firstName ?? '');
    setEditLast(user?.lastName ?? '');
    setEditEmail(user?.email ?? '');
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editFirst.trim()) {
      Alert.alert('Required', 'First name cannot be empty.');
      return;
    }
    setSavingEdit(true);
    try {
      const fresh = await updateProfile({
        firstName: editFirst.trim(),
        lastName: editLast.trim(),
        // Blank → undefined so the backend leaves/unsets the field. Sending
        // '' used to *write* an empty string, which collides on the sparse
        // unique email index once a second user does the same (E11000 → the
        // "Profile update failed" everyone was seeing).
        email: editEmail.trim() || undefined,
      });
      if (fresh) setUser(fresh);
      setEditOpen(false);
    } catch (err: any) {
      Alert.alert('Update failed', err?.message ?? 'Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  const load = useCallback(async () => {
    try {
      const [u, dash] = await Promise.all([
        fetchCurrentUser(),
        fetchMyDashboard().catch(() => null),
      ]);
      setUser(u);
      if (dash) {
        setStats({
          totalEarnings: dash.stats.totalEarnings,
          totalServices: dash.stats.totalServices,
        });
      }
    } catch (err) {
      console.warn('[profile] fetch failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const uploadAsset = async (asset: Asset | undefined) => {
    if (!asset?.uri) return;
    setUploadingAvatar(true);
    try {
      const { url } = await uploadAvatar({
        uri: asset.uri,
        fileName: asset.fileName,
        type: asset.type,
      });
      setUser(prev => (prev ? { ...prev, avatar: url } : prev));
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message ?? 'Try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onPickAvatar = async () => {
    if (uploadingAvatar) return;
    // Front camera for a selfie-style profile photo.
    const asset = await pickImageFromSource('Update profile photo', {
      cameraType: 'front',
    });
    if (asset) await uploadAsset(asset);
  };

  const dp = user?.driverProfile;
  const driverName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    dp?.ownerName ||
    'Driver';
  // Short, readable Driver ID derived from the Mongo _id. We slice the last
  // 6 chars and uppercase them — stable per-driver, easy to reference.
  const driverId = user?.id ? user.id.slice(-6).toUpperCase() : '—';
  const phone = user?.phone || '—';
  const email = user?.email || '—';
  const location = dp?.ownerAddress || '—';
  const vehicleModel =
    [dp?.vehicleMake, dp?.vehicleModel].filter(Boolean).join(' ') || '—';
  const licensePlate = dp?.plateNumber || '—';
  const vehicleColor = dp?.vehicleColor || '—';
  const totalEarning = stats ? formatRupees(stats.totalEarnings) : '—';
  const totalTrips = stats ? String(stats.totalServices) : '—';
  // Real average is 0 until the first rating; show a neutral 5.0 until then
  // (matches the customer app + dashboard). A real average is always >= 1.
  const rating = (dp?.rating && dp.rating > 0 ? dp.rating : 5).toFixed(1);

  const formatDate = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };
  // Some accounts store phone with the country code already baked in
  // (e.g. "+910000000001" from the seed). Don't double-prefix it.
  const rawPhone = user?.phone?.trim() || '';
  const fullPhone = rawPhone
    ? rawPhone.startsWith('+')
      ? rawPhone
      : `${user?.countryCode || ''} ${rawPhone}`.trim()
    : '—';
  const joiningDate = formatDate(user?.createdAt);
  const licenceNumber = (dp as any)?.licenceNumber || '—';
  const licenceValidity = formatDate((dp as any)?.licenceExpiry);
  const emergencyNumber = (dp as any)?.ownerContact || '—';
  const partnerType =
    dp?.serviceType
      ? `${dp.serviceType.charAt(0).toUpperCase()}${dp.serviceType.slice(1)} Partner`
      : 'UKCAAR Partner';

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#0097B3', '#00C896']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="px-6 pb-6 pt-2">
            <View className="flex-row items-center gap-3">
              <Pressable onPress={onBack} hitSlop={10}>
                <BackArrowIcon size={22} color="white" />
              </Pressable>
              <Text className="text-[20px] font-poppins-semibold text-white">Profile</Text>
            </View>

            <Pressable
              onPress={() => setIdCardOpen(true)}
              className="mt-6 flex-row items-center gap-4"
            >
              <Pressable
                onPress={onPickAvatar}
                hitSlop={6}
                className="h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white/25"
              >
                {user?.avatar ? (
                  <Image
                    source={{ uri: user.avatar }}
                    className="h-16 w-16"
                    resizeMode="cover"
                  />
                ) : (
                  <TabProfileIcon size={32} color="white" />
                )}
                {uploadingAvatar && (
                  <View className="absolute inset-0 items-center justify-center bg-black/30">
                    <ActivityIndicator color="white" />
                  </View>
                )}
              </Pressable>
              <View className="flex-1">
                <Text className="text-[20px] font-poppins-semibold text-white">{driverName}</Text>
                <Text className="text-sm text-white/80">Driver ID: {driverId}</Text>
              </View>
              <ChevronRightIcon size={22} color="white" />
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && !user ? (
          <View className="py-20 items-center">
            <ActivityIndicator color="#0097B3" />
          </View>
        ) : (
          <>
        <View className="flex-row border-b border-[#E5E7EB] bg-white px-4 py-4">
          <View className="flex-1 items-center">
            <Text className="text-xs text-[#6A7282]">Total Earning</Text>
            <Text className="mt-1 text-base font-poppins-semibold text-[#1E293B]">{totalEarning}</Text>
          </View>
          <View className="h-10 w-px bg-[#E5E7EB]" />
          <View className="flex-1 items-center">
            <Text className="text-xs text-[#6A7282]">Total Trips</Text>
            <Text className="mt-1 text-base font-poppins-semibold text-[#1E293B]">{totalTrips}</Text>
          </View>
          <View className="h-10 w-px bg-[#E5E7EB]" />
          <View className="flex-1 items-center">
            <Text className="text-xs text-[#6A7282]">Rating</Text>
            <Text className="mt-1 text-base font-poppins-semibold text-[#1E293B]">{rating}</Text>
          </View>
        </View>

        <View className="px-6 pt-5">
          <Text className="text-base font-poppins-semibold text-[#1E293B]">Contact Information</Text>
          <View className="mt-3 gap-3">
            <View className="flex-row items-center gap-3">
              <PhoneIcon size={18} color="#0097B3" />
              <Text className="text-sm text-[#1E293B]">{phone}</Text>
            </View>
            <View className="flex-row items-center gap-3">
              <EmailIcon size={18} color="#0097B3" />
              <Text className="text-sm text-[#1E293B]">{email}</Text>
            </View>
            <View className="flex-row items-center gap-3">
              <MapPinIcon size={18} color="#0097B3" />
              <Text className="text-sm text-[#1E293B]">{location}</Text>
            </View>
          </View>
        </View>

        <View className="mt-6 px-6">
          <Text className="text-base font-poppins-semibold text-[#1E293B]">Vehicle Information</Text>
          <View className="mt-3 flex-row items-center gap-3">
            <CarOutlineIcon size={18} color="#00C896" />
            <Text className="text-sm text-[#1E293B]">{vehicleModel}</Text>
          </View>
          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-sm text-[#6A7282]">License Plate:</Text>
            <Text className="text-sm font-poppins-semibold text-[#1E293B]">{licensePlate}</Text>
          </View>
          <View className="mt-2 flex-row items-center justify-between pb-4">
            <Text className="text-sm text-[#6A7282]">Color:</Text>
            <Text className="text-sm font-poppins-semibold text-[#1E293B]">{vehicleColor}</Text>
          </View>
        </View>

        <View className="mt-2 bg-white">
          <MenuRow
            icon={<TabProfileIcon size={20} color="#0097B3" />}
            label="Edit Profile"
            onPress={openEdit}
          />
          {/* Route change is a scheduled-shuttle concept — instant/private
              drivers have no fixed route, so it's hidden for them. */}
          {(serviceType ?? dp?.serviceType) === 'scheduled' && (
            <MenuRow
              icon={<MapPinIcon size={20} color="#0097B3" />}
              label="Apply for Route Change"
              onPress={onOpenRouteChange}
            />
          )}
          <MenuRow
            icon={<ClockSmallIcon size={20} color="#0097B3" />}
            label="History"
            onPress={onOpenHistory}
          />
          <MenuRow
            icon={<DocumentIcon size={20} color="#0097B3" />}
            label="Documents"
            onPress={onOpenDocuments}
          />
          <MenuRow
            icon={<BankIcon size={20} color="#0097B3" />}
            label="Bank Details"
            onPress={onOpenBankDetails}
          />
          <MenuRow
            icon={<WalletIcon size={20} color="#0097B3" />}
            label="My Wallet"
            onPress={onOpenWallet}
          />
          <MenuRow
            icon={<WalletIcon size={20} color="#0097B3" />}
            label="OnePass"
            onPress={onOpenOnePass}
          />
          <MenuRow
            icon={<GiftIcon size={20} color="#0097B3" />}
            label="Incentives"
            onPress={onOpenIncentives}
          />
          <MenuRow
            icon={<GiftIcon size={20} color="#0097B3" />}
            label="Refer and Earn"
            onPress={onOpenRefer}
          />
          <MenuRow
            icon={<HelpIcon size={20} color="#0097B3" />}
            label="Help"
            onPress={onOpenHelp}
          />
          <MenuRow
            icon={<ClipboardListIcon size={20} color="#0097B3" />}
            label="Driver Instructions"
            onPress={onOpenDriverInstructions}
          />
          <MenuRow
            icon={<LogoutIcon size={20} color="#E02D3C" />}
            label="Logout"
            color="#E02D3C"
            onPress={onLogout}
          />
        </View>

        <View className="h-8" />
          </>
        )}
      </ScrollView>

      {/* Edit Profile modal */}
      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <Pressable
          onPress={() => setEditOpen(false)}
          className="flex-1 justify-end bg-black/50"
        >
          <Pressable onPress={(e) => e.stopPropagation()} className="rounded-t-3xl bg-white px-6 pb-8 pt-5">
            <Text className="mb-4 text-center text-lg font-poppins-semibold text-[#1E293B]">Edit Profile</Text>

            <Text className="mb-1 text-xs font-poppins-semibold text-[#6A7282]">First Name</Text>
            <TextInput
              value={editFirst}
              onChangeText={setEditFirst}
              placeholder="First name"
              placeholderTextColor="#B0B0B0"
              className="mb-3 rounded-xl border border-[#E5E7EB] px-4 py-3 text-[15px] text-[#1E293B]"
            />

            <Text className="mb-1 text-xs font-poppins-semibold text-[#6A7282]">Last Name</Text>
            <TextInput
              value={editLast}
              onChangeText={setEditLast}
              placeholder="Last name"
              placeholderTextColor="#B0B0B0"
              className="mb-3 rounded-xl border border-[#E5E7EB] px-4 py-3 text-[15px] text-[#1E293B]"
            />

            <Text className="mb-1 text-xs font-poppins-semibold text-[#6A7282]">Email</Text>
            <TextInput
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="Email"
              placeholderTextColor="#B0B0B0"
              autoCapitalize="none"
              keyboardType="email-address"
              className="mb-5 rounded-xl border border-[#E5E7EB] px-4 py-3 text-[15px] text-[#1E293B]"
            />

            <Pressable
              onPress={handleSaveEdit}
              disabled={savingEdit}
              className="h-12 items-center justify-center rounded-xl bg-[#0097B3]"
              style={savingEdit ? { opacity: 0.6 } : undefined}
            >
              {savingEdit ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-base font-poppins-medium text-white">Save</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setEditOpen(false)} className="mt-2 h-11 items-center justify-center">
              <Text className="text-sm font-poppins-medium text-[#6A7282]">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <DriverIdCardModal
        visible={idCardOpen}
        onClose={() => setIdCardOpen(false)}
        name={driverName}
        partnerType={partnerType}
        partnerId={`#${driverId}`}
        mobileNumber={fullPhone}
        joiningDate={joiningDate}
        drivingLicense={licenceNumber}
        emergencyNumber={emergencyNumber}
        licenseValidity={licenceValidity}
        avatarUrl={user?.avatar}
      />
    </View>
  );
}

export default ProfileScreen;
