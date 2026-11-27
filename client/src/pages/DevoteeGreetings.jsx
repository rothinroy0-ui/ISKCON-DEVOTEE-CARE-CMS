import React, { useEffect, useMemo, useState } from 'react';
import {
  Cake,
  Heart,
  Sparkles,
  Sun,
  MessageCircle,
  Search,
  Send,
  Phone,
  MapPin,
} from 'lucide-react';
import { apiRequest } from '../api';
import { useToast } from '../components/Toast';

const GREETING_CATEGORIES = [
  {
    key: 'birthday',
    label: 'Birthday Wishes',
    subtitle: 'Blessings on auspicious appearance day',
    icon: Cake,
    badgeClass: 'bg-pink-50 text-pink-700 ring-pink-200',
    activeClass: 'ring-2 ring-pink-500 bg-pink-50/60',
    defaultMessage:
      'Hare Krishna {Name}! Wishing you a very Happy Krishna Conscious Birthday! May Sri Sri Radha Madhav shower Their choicest blessings upon you and your family. — ISKCON Durgapur',
    presets: [
      {
        label: 'Standard Birthday',
        text: 'Hare Krishna {Name}! Wishing you a very Happy Krishna Conscious Birthday! May Sri Sri Radha Madhav shower Their choicest blessings upon you and your family. — ISKCON Durgapur',
      },
      {
        label: 'Short & Sweet',
        text: 'Hare Krishna {Name}! Happy Birthday! May Lord Sri Krishna bless you with good health, happiness, and steady devotion. — ISKCON Durgapur',
      },
    ],
  },
  {
    key: 'anniversary',
    label: 'Anniversary Wishes',
    subtitle: 'Warm wishes for Grihastha couples',
    icon: Heart,
    badgeClass: 'bg-rose-50 text-rose-700 ring-rose-200',
    activeClass: 'ring-2 ring-rose-500 bg-rose-50/60',
    defaultMessage:
      'Hare Krishna {Name}! Wishing you a blessed and blissful Marriage Anniversary! May Sri Sri Radha Madhav bless your family with devotion, harmony, and peace. — ISKCON Durgapur',
    presets: [
      {
        label: 'Standard Anniversary',
        text: 'Hare Krishna {Name}! Wishing you a blessed and blissful Marriage Anniversary! May Sri Sri Radha Madhav bless your family with devotion, harmony, and peace. — ISKCON Durgapur',
      },
      {
        label: 'Short Blessing',
        text: 'Hare Krishna {Name}! Heartfelt Marriage Anniversary wishes from ISKCON Durgapur (RADHAPUR Devotee Care). May Krishna always protect and guide your family.',
      },
    ],
  },
  {
    key: 'festival',
    label: 'Festival Greetings',
    subtitle: 'Ekadashi, Janmashtami, Gaura Purnima & more',
    icon: Sun,
    badgeClass: 'bg-amber-50 text-amber-700 ring-amber-200',
    activeClass: 'ring-2 ring-amber-500 bg-amber-50/60',
    defaultMessage:
      'Hare Krishna {Name}! Wishing you and your family a joyful and auspicious festival! Please join us for darshan, kirtan, and Maha Prasadam at ISKCON Durgapur.',
    presets: [
      {
        label: 'General Festival',
        text: 'Hare Krishna {Name}! Wishing you and your family a joyful and auspicious festival! Please join us for darshan, kirtan, and Maha Prasadam at ISKCON Durgapur.',
      },
      {
        label: 'Sri Krishna Janmashtami',
        text: 'Hare Krishna {Name}! Wishing you a blissful Sri Krishna Janmashtami! May Lord Sri Krishna fill your heart with love and devotion. — ISKCON Durgapur',
      },
      {
        label: 'Gaura Purnima',
        text: 'Hare Krishna {Name}! Happy Gaura Purnima! May Sri Chaitanya Mahaprabhu bless you with boundless mercy and Harinam Sankirtan. — ISKCON Durgapur',
      },
      {
        label: 'Ekadashi Reminder',
        text: 'Hare Krishna {Name}! Today is auspicious Ekadashi. Wishing you a spiritually uplifting fast and joyful chanting of the Holy Names. — ISKCON Durgapur',
      },
    ],
  },
  {
    key: 'special',
    label: 'Special Devotional Greetings',
    subtitle: 'Sunday Feast, Prasadam & Seva gratitude',
    icon: Sparkles,
    badgeClass: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    activeClass: 'ring-2 ring-indigo-500 bg-indigo-50/60',
    defaultMessage:
      'Hare Krishna {Name}! May Sri Sri Radha Madhav bless you with steady sadhana, joyful chanting, and wonderful association of devotees. — ISKCON Durgapur',
    presets: [
      {
        label: 'Devotional Blessing',
        text: 'Hare Krishna {Name}! May Sri Sri Radha Madhav bless you with steady sadhana, joyful chanting, and wonderful association of devotees. — ISKCON Durgapur',
      },
      {
        label: 'Sunday Love Feast',
        text: 'Hare Krishna {Name}! You are warmly invited to join our Sunday Love Feast program with Kirtan, Bhagavad-gita class, and Maha Prasadam at ISKCON Durgapur.',
      },
      {
        label: 'Thank You for Seva',
        text: 'Hare Krishna {Name}! Thank you sincerely for your wonderful seva and support to ISKCON Durgapur (RADHAPUR Devotee Care). May Lord Krishna bless you abundantly.',
      },
    ],
  },
];

export default function DevoteeGreetings() {
  const toast = useToast();
  const [devotees, setDevotees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState('birthday');
  const [messageText, setMessageText] = useState(
    GREETING_CATEGORIES[0].defaultMessage
  );
  const [occasionFilter, setOccasionFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sendingId, setSendingId] = useState(null);
  const [sentIds, setSentIds] = useState({});
  const [visibleCount, setVisibleCount] = useState(60);

  useEffect(() => {
    setLoading(true);
    apiRequest('/api/devotees?sort=upcoming_birthday', { cache: true })
      .then((res) => {
        setDevotees(res.devotees || []);
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load devotees');
      })
      .finally(() => setLoading(false));
  }, []);

  const currentCategory = useMemo(
    () =>
      GREETING_CATEGORIES.find((c) => c.key === selectedCat) ||
      GREETING_CATEGORIES[0],
    [selectedCat]
  );

  const handleSelectCategory = (cat) => {
    setSelectedCat(cat.key);
    setMessageText(cat.defaultMessage);
    setOccasionFilter('all');
    setVisibleCount(60);
  };

  const buildMessageForDevotee = (d) => {
    const name =
      (d.initiated_name || d.spiritual_name || d.full_name || 'Devotee').trim();
    return messageText.replace(/\{Name\}/gi, name);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return devotees.filter((d) => {
      if (selectedCat === 'birthday' && occasionFilter !== 'all') {
        const days = d.days_until_birthday;
        if (days === null || days === undefined) return false;
        if (occasionFilter === 'today' && days !== 0) return false;
        if (occasionFilter === '7d' && (days < 0 || days > 7)) return false;
        if (occasionFilter === '30d' && (days < 0 || days > 30)) return false;
      }
      if (selectedCat === 'anniversary' && occasionFilter !== 'all') {
        const days = d.days_until_anniversary;
        if (days === null || days === undefined) return false;
        if (occasionFilter === 'today' && days !== 0) return false;
        if (occasionFilter === '7d' && (days < 0 || days > 7)) return false;
        if (occasionFilter === '30d' && (days < 0 || days > 30)) return false;
      }
      if (!q) return true;
      const haystack = [
        d.full_name,
        d.initiated_name,
        d.spiritual_name,
        d.devotee_id,
        d.contact_no,
        d.whatsapp_no,
        d.phone,
        d.town_city,
        d.city,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [devotees, search, selectedCat, occasionFilter]);

  const handleSendWhatsApp = async (d) => {
    const phone = d.whatsapp_no || d.contact_no || d.phone;
    if (!phone) {
      toast.error(`No phone or WhatsApp number for ${d.full_name}`);
      return;
    }
    const message = buildMessageForDevotee(d);
    setSendingId(d.id);
    try {
      const res = await apiRequest('/api/devotees/communicate', {
        method: 'POST',
        body: JSON.stringify({
          devoteeId: d.id,
          phone,
          message,
          category: 'greeting',
          subType: currentCategory.label,
        }),
      });
      const wa = res?.whatsappNotification;
      setSentIds((prev) => ({ ...prev, [d.id]: currentCategory.key }));
      if (wa?.autoSent) {
        toast.success(
          `${currentCategory.label} sent to ${d.full_name} via WhatsApp!`
        );
      } else if (wa?.waUrl) {
        toast.success(
          `Opening WhatsApp (${currentCategory.label}) for ${d.full_name}...`
        );
        window.open(wa.waUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send WhatsApp greeting');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Greeting Categories */}
      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          Greeting Categories
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GREETING_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = cat.key === selectedCat;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => handleSelectCategory(cat)}
                className={`rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition ${
                  isActive
                    ? cat.activeClass
                    : 'ring-slate-200 hover:bg-slate-50/70'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${cat.badgeClass}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cat.label}
                  </span>
                </div>
                <p className="mt-2.5 text-xs text-slate-600">{cat.subtitle}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Greeting Composer */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {currentCategory.label} Composer
            </h3>
            <p className="text-xs text-slate-500">
              Use <code className="rounded bg-slate-100 px-1 py-0.5">{'{Name}'}</code> to personalize the greeting for each devotee.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {currentCategory.presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setMessageText(preset.text)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          rows={3}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      {/* Search & Occasion Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(60);
            }}
            placeholder="Search devotee by name, Devotee ID, phone, or city..."
            className="w-full rounded-xl border border-slate-200 py-2 pr-3 pl-9 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {(selectedCat === 'birthday' || selectedCat === 'anniversary') && (
          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: 'all', label: 'All Devotees' },
              { value: 'today', label: 'Today' },
              { value: '7d', label: 'Next 7 Days' },
              { value: '30d', label: 'Next 30 Days' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setOccasionFilter(opt.value);
                  setVisibleCount(60);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  occasionFilter === opt.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Devotees Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Loading devotees...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No matching devotees found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Devotee</th>
                  <th className="px-4 py-3">Phone / WhatsApp</th>
                  <th className="px-4 py-3">City</th>
                  {(selectedCat === 'birthday' ||
                    selectedCat === 'anniversary') && (
                    <th className="px-4 py-3">
                      {selectedCat === 'birthday' ? 'Birthday' : 'Anniversary'}
                    </th>
                  )}
                  <th className="px-4 py-3 text-right">Send Greeting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.slice(0, visibleCount).map((d) => {
                  const phone = d.whatsapp_no || d.contact_no || d.phone || '';
                  const sentCat = sentIds[d.id];
                  const daysVal =
                    selectedCat === 'birthday'
                      ? d.days_until_birthday
                      : d.days_until_anniversary;
                  const dateVal =
                    selectedCat === 'birthday'
                      ? d.dob
                      : d.marriage_anniversary;

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {d.initiated_name || d.spiritual_name || d.full_name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {d.initiated_name ? `${d.full_name} · ` : ''}
                          {d.devotee_id || `#${d.id}`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {phone ? (
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {phone}
                          </span>
                        ) : (
                          <span className="text-slate-400">No number</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {d.town_city || d.city ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            {d.town_city || d.city}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      {(selectedCat === 'birthday' ||
                        selectedCat === 'anniversary') && (
                        <td className="px-4 py-3 text-xs">
                          <div className="font-medium text-slate-700">
                            {dateVal || '—'}
                          </div>
                          {daysVal !== null && daysVal !== undefined && (
                            <span
                              className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                daysVal === 0
                                  ? 'bg-pink-100 text-pink-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {daysVal === 0 ? 'Today!' : `In ${daysVal} days`}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          {sentCat && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              Sent
                            </span>
                          )}
                          <button
                            type="button"
                            disabled={!phone || sendingId === d.id}
                            onClick={() => handleSendWhatsApp(d)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            {sendingId === d.id ? (
                              'Sending...'
                            ) : (
                              <>
                                <Send className="h-3 w-3" />
                                Send Greeting
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > visibleCount && (
          <div className="border-t border-slate-100 p-4 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 60)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Show More ({filtered.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
