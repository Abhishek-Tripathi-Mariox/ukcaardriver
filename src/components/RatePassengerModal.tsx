import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { StarIcon } from './icons/ServiceTypeIcons';

interface RatePassengerModalProps {
  visible: boolean;
  passengerName?: string;
  submitting?: boolean;
  onSubmit: (rating: number, comment: string) => void;
  onSkip: () => void;
}

/**
 * Post-ride prompt for the driver to rate the passenger. Mirrors the
 * customer's rating sheet. Submits via the shared /rate endpoint, which the
 * backend records as the driver→customer direction.
 */
export function RatePassengerModal({
  visible,
  passengerName = 'Passenger',
  submitting = false,
  onSubmit,
  onSkip,
}: RatePassengerModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onSkip}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-3xl bg-white px-6 pb-8 pt-6">
          <Text className="text-center text-[20px] font-poppins-semibold text-[#1E293B]">
            Rate your passenger
          </Text>
          <Text className="mt-1 text-center text-sm text-[#6A7282]">
            How was your trip with {passengerName}?
          </Text>

          <View className="mt-5 flex-row justify-center gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Pressable key={i} onPress={() => setRating(i)} hitSlop={6}>
                <StarIcon size={40} color={i <= rating ? '#FFB100' : '#E5E7EB'} />
              </Pressable>
            ))}
          </View>

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Add a note (optional)"
            placeholderTextColor="#9CA3AF"
            multiline
            className="mt-5 min-h-[72px] rounded-2xl bg-[#F3F3F5] p-4 text-[15px] text-[#1E293B]"
            style={{ textAlignVertical: 'top' }}
          />

          <Pressable
            onPress={() => rating > 0 && onSubmit(rating, comment)}
            disabled={rating === 0 || submitting}
            className="mt-5 h-14 items-center justify-center rounded-2xl bg-brand-teal"
            style={{ opacity: rating === 0 || submitting ? 0.5 : 1 }}
          >
            <Text className="text-sm font-poppins-medium text-white">
              {submitting ? 'Submitting…' : 'Submit Rating'}
            </Text>
          </Pressable>
          <Pressable onPress={onSkip} className="mt-3 h-12 items-center justify-center">
            <Text className="text-sm font-poppins-medium text-[#6A7282]">Skip</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default RatePassengerModal;
