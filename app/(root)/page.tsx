import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { dummyInterviews } from '@/constants'
import InterviewCard from '@/components/InterviewCard'
import { getCurrentUser } from '@/lib/actions/auth.action'
import{getInterviewsByUserId,getLatestInterviews} from '@/lib/actions/general.action'

const page = async() => {
  const user=await getCurrentUser();
  const [userInterviews, latestInterviews] = await Promise.all([
    getInterviewsByUserId(user?.id!),
    getLatestInterviews({ userId: user?.id! }),
  ]);
  const hasPastInterviews=userInterviews?.length!>0;
  const hasUpcomingInterviews = latestInterviews?.length! > 0;
  return (
    <>
    <section className='card-cta'>
      <div className='flex flex-col gap-6 max-w-lg'>
        <h2>Level Up Your Interview Skills with AI-Driven Practice</h2>
        <p className='text-lg'>
          Practice on real interview questions with AI-generated mock interviews and get instant feedback.
        </p>
        <Button asChild className='btn-primary max-sm:w-full'>
          <Link href="/interview">Start an Interview</Link>
        </Button>
      </div>
      <Image src="/robot.png" alt="robo" height={400} width={400} 
      className='max-sm:hidden'/>
    </section>
    <section className='flex flex-col gap-6 mt-8'>
      <h2>Your Interviews</h2>
      <div className='interviews-section'>
        {
          hasPastInterviews?(
            userInterviews?.map((interview)=>(
              <InterviewCard {...interview} key={interview.id}/>
            ))
          ): <p>You havent taken any interviews</p>
        }
      </div>
    </section>
    <section className='flex flex-col gap-6 mt-8'>
      <h2>Take an interview</h2>
      <div className='interviews-section'>
        {hasUpcomingInterviews?(
            latestInterviews?.map((interview)=>(
              <InterviewCard {...interview} key={interview.id}/>
            ))
          ): <p>There are no new interviews available</p>}
      </div>
    </section>
    </>
  )
}

export default page